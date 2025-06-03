# api/routes/graphs.py
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException

from ...datamodel import Graph
from ...gallery.builder import create_default_gallery
from ..deps import get_db

router = APIRouter()


@router.get("/")
async def list_graphs(user_id: str, db=Depends(get_db)) -> Dict:
    """List all graphs for a user"""
    response = db.get(Graph, filters={"user_id": user_id})

    if not response.data or len(response.data) == 0:
        default_gallery = create_default_gallery()
        # Check if default gallery has graphs, otherwise create a simple default
        if hasattr(default_gallery.components, 'graphs') and default_gallery.components.graphs:
            default_graph = Graph(user_id=user_id, component=default_gallery.components.graphs[0].model_dump())
        else:
            # Fallback to a simple default graph if gallery doesn't have graphs
            simple_graph_config = {
                "provider": "autogen_agentchat.graphs.GraphChat",
                "component_type": "graph",
                "version": 1,
                "component_version": 1,
                "description": "A simple graph with an assistant agent",
                "label": "Simple Graph",
                "config": {
                    "participants": [],
                    "graph": {
                        "nodes": {},
                    },
                },
            }
            default_graph = Graph(user_id=user_id, component=simple_graph_config)

        db.upsert(default_graph)
        response = db.get(Graph, filters={"user_id": user_id})

    return {"status": True, "data": response.data}


@router.get("/{graph_id}")
async def get_graph(graph_id: int, user_id: str, db=Depends(get_db)) -> Dict:
    """Get a specific graph"""
    response = db.get(Graph, filters={"id": graph_id, "user_id": user_id})
    if not response.status or not response.data:
        raise HTTPException(status_code=404, detail="Graph not found")
    return {"status": True, "data": response.data[0]}


@router.post("/")
async def create_graph(graph: Graph, db=Depends(get_db)) -> Dict:
    """Create a new graph"""
    response = db.upsert(graph)
    if not response.status:
        raise HTTPException(status_code=400, detail=response.message)
    return {"status": True, "data": response.data}


@router.delete("/{graph_id}")
async def delete_graph(graph_id: int, user_id: str, db=Depends(get_db)) -> Dict:
    """Delete a graph"""
    db.delete(filters={"id": graph_id, "user_id": user_id}, model_class=Graph)
    return {"status": True, "message": "Graph deleted successfully"} 