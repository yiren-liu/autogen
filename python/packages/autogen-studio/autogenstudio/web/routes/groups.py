# api/routes/groups.py
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from ...datamodel import Group
from ..deps import get_db

router = APIRouter()


@router.get("/")
async def list_groups(
    user_id: str, 
    node_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db=Depends(get_db)
) -> Dict:
    """List all groups for a user"""
    filters = {"user_id": user_id}
    
    response = db.get(Group, filters=filters)

    if not response.status:
        return {"status": False, "message": "Failed to fetch groups", "data": []}

    groups = response.data or []
    
    # Apply filtering if parameters are provided
    if node_type or search:
        filtered_groups = []
        for group in groups:
            # Filter by node_type if specified
            if node_type:
                has_node_type = any(
                    node.get("node_type") == node_type 
                    for node in group.nodes or []
                )
                if not has_node_type:
                    continue
            
            # Filter by search term if specified
            if search:
                search_lower = search.lower()
                if not (
                    search_lower in (group.name or "").lower() or
                    search_lower in (group.description or "").lower() or
                    any(search_lower in tag.lower() for tag in group.tags or [])
                ):
                    continue
            
            filtered_groups.append(group)
        
        groups = filtered_groups

    return {"status": True, "data": groups}


@router.get("/{group_id}")
async def get_group(group_id: int, user_id: str, db=Depends(get_db)) -> Dict:
    """Get a specific group"""
    response = db.get(Group, filters={"id": group_id, "user_id": user_id})
    if not response.status or not response.data:
        raise HTTPException(status_code=404, detail="Group not found")
    return {"status": True, "data": response.data[0]}


@router.post("/")
async def create_group(group: Group, db=Depends(get_db)) -> Dict:
    """Create a new group"""
    response = db.upsert(group)
    if not response.status:
        raise HTTPException(status_code=400, detail=response.message)
    return {"status": True, "data": response.data}


@router.put("/{group_id}")
async def update_group(group_id: int, group: Group, db=Depends(get_db)) -> Dict:
    """Update a group"""
    # Check if group exists and belongs to user
    existing_response = db.get(Group, filters={"id": group_id, "user_id": group.user_id})
    if not existing_response.status or not existing_response.data:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Update the group with the new ID
    group.id = group_id
    response = db.upsert(group)
    if not response.status:
        raise HTTPException(status_code=400, detail=response.message)
    return {"status": True, "data": response.data}


@router.delete("/{group_id}")
async def delete_group(group_id: int, user_id: str, db=Depends(get_db)) -> Dict:
    """Delete a group"""
    # Check if group exists and belongs to user
    existing_response = db.get(Group, filters={"id": group_id, "user_id": user_id})
    if not existing_response.status or not existing_response.data:
        raise HTTPException(status_code=404, detail="Group not found")
    
    db.delete(filters={"id": group_id, "user_id": user_id}, model_class=Group)
    return {"status": True, "message": "Group deleted successfully"} 