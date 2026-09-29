from langgraph.graph import StateGraph, END
from langgraph.checkpoint.postgres import PostgresSaver
from app.core.db import pool

from app.graph.state import AgentState
from app.graph.nodes import (
    route_intent,
    search_index,
    resolve_conflict,
    synthesize_answer,
    aggregate_output,
    loop_guard,
    MAX_LOOPS,
)



def should_retry(state: AgentState) -> str:
    if state.get("query_type") == "chitchat":
        return "proceed"
    if state.get("error"):
        return "proceed"
    no_results = len(state["retrieved_chunks"]) == 0
    under_budget = state.get("loop_count", 0) < MAX_LOOPS
    if no_results and under_budget:
        return "retry"
    return "proceed"


def build_graph():
    graph = StateGraph(AgentState)

    graph.add_node("route_intent", route_intent)
    graph.add_node("search_index", search_index)
    graph.add_node("loop_guard", loop_guard)
    graph.add_node("resolve_conflict", resolve_conflict)
    graph.add_node("synthesize_answer", synthesize_answer)
    graph.add_node("aggregate_output", aggregate_output)

    graph.set_entry_point("route_intent")
    graph.add_edge("route_intent", "search_index")

    graph.add_conditional_edges(
        "search_index",
        should_retry,
        {"retry": "loop_guard", "proceed": "resolve_conflict"},
    )
    graph.add_edge("loop_guard", "route_intent")

    graph.add_edge("resolve_conflict", "synthesize_answer")
    graph.add_edge("synthesize_answer", "aggregate_output")
    graph.add_edge("aggregate_output", END)

    if pool:
        checkpointer = PostgresSaver(pool)
        checkpointer.setup()
        return graph.compile(checkpointer=checkpointer)
    return graph.compile()


workflow = build_graph()