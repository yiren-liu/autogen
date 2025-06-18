# api/routes/test_cases.py
from typing import Dict, List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query

from ...datamodel import TestCase
from ..deps import get_db

router = APIRouter()


@router.get("/")
async def list_test_cases(
    user_id: str,
    group_id: Optional[int] = Query(None),
    graph_id: Optional[int] = Query(None),
    db=Depends(get_db)
) -> Dict:
    """List test cases"""
    filters = {"user_id": user_id}
    
    # Add target-specific filters
    if group_id:
        filters.update({"target_type": "group", "target_id": group_id})
    elif graph_id:
        filters.update({"target_type": "graph", "target_id": graph_id})
    
    response = db.get(TestCase, filters=filters)

    if not response.status:
        return {"status": False, "message": "Failed to fetch test cases", "data": []}

    return {"status": True, "data": response.data or []}


@router.get("/{test_case_id}")
async def get_test_case(test_case_id: int, user_id: str, db=Depends(get_db)) -> Dict:
    """Get a specific test case"""
    response = db.get(TestCase, filters={"id": test_case_id, "user_id": user_id})
    if not response.status or not response.data:
        raise HTTPException(status_code=404, detail="Test case not found")
    return {"status": True, "data": response.data[0]}


@router.post("/")
async def create_test_case(test_case: TestCase, db=Depends(get_db)) -> Dict:
    """Create a new test case"""
    response = db.upsert(test_case)
    if not response.status:
        raise HTTPException(status_code=400, detail=response.message)
    return {"status": True, "data": response.data}


@router.put("/{test_case_id}")
async def update_test_case(test_case_id: int, test_case: TestCase, db=Depends(get_db)) -> Dict:
    """Update a test case"""
    # Check if test case exists and belongs to user
    existing_response = db.get(TestCase, filters={"id": test_case_id, "user_id": test_case.user_id})
    if not existing_response.status or not existing_response.data:
        raise HTTPException(status_code=404, detail="Test case not found")
    
    # Update the test case with the new ID
    test_case.id = test_case_id
    response = db.upsert(test_case)
    if not response.status:
        raise HTTPException(status_code=400, detail=response.message)
    return {"status": True, "data": response.data}


@router.delete("/{test_case_id}")
async def delete_test_case(test_case_id: int, user_id: str, db=Depends(get_db)) -> Dict:
    """Delete a test case"""
    # Check if test case exists and belongs to user
    existing_response = db.get(TestCase, filters={"id": test_case_id, "user_id": user_id})
    if not existing_response.status or not existing_response.data:
        raise HTTPException(status_code=404, detail="Test case not found")
    
    db.delete(filters={"id": test_case_id, "user_id": user_id}, model_class=TestCase)
    return {"status": True, "message": "Test case deleted successfully"}


@router.post("/{test_case_id}/execute")
async def execute_test_case(
    test_case_id: int,
    timeout: Optional[int] = None,
    judge_overrides: Optional[Dict] = None,
    db=Depends(get_db)
) -> Dict:
    """Execute an LLM-as-a-Judge test case"""
    start_time = datetime.now()
    
    try:
        # Get the test case
        response = db.get(TestCase, filters={"id": test_case_id})
        if not response.status or not response.data:
            raise HTTPException(status_code=404, detail="Test case not found")
        
        test_case = response.data[0]
        execution_timeout = timeout or test_case.timeout or 120
        
        # Validate test case configuration
        if not test_case.context or not test_case.input_query:
            raise HTTPException(
                status_code=400, 
                detail="Test case missing required fields: context and input_query are required"
            )
        
        if not test_case.oracles or len(test_case.oracles.get("expected_examples", [])) == 0:
            raise HTTPException(
                status_code=400,
                detail="Test case must have at least one expected example in oracles"
            )
        
        if not test_case.scoring_rubrics or len(test_case.scoring_rubrics) == 0:
            raise HTTPException(
                status_code=400,
                detail="Test case must have at least one scoring rubric"
            )
        
        logs = ["Test case execution started"]
        
        # TODO: Implement actual target system execution
        # This is where we would run the actual group/graph
        try:
            logs.append(f"Running target {test_case.target_type} (ID: {test_case.target_id})")
            
            # Simulate target execution - replace with actual implementation
            target_output = {
                "response": "This is a placeholder response from the target system",
                "metadata": {"tokens_used": 150, "model": "gpt-4o-mini"}
            }
            logs.append("Target execution completed")
            
        except Exception as e:
            logs.append(f"Target execution failed: {str(e)}")
            execution_result = {
                "test_case_id": test_case_id,
                "status": "failed",
                "execution_time": (datetime.now() - start_time).total_seconds(),
                "target_output": None,
                "judge_results": None,
                "logs": logs,
                "error_message": f"Target system execution failed: {str(e)}",
                "executed_at": datetime.now().isoformat()
            }
            
            # Still save failed execution for debugging
            test_case.latest_execution = execution_result
            db.upsert(test_case)
            
            raise HTTPException(
                status_code=500,
                detail=f"Target system execution failed: {str(e)}"
            )
        
        # TODO: Implement actual LLM judge execution
        try:
            logs.append("Sending to LLM judge for evaluation")
            
            # Apply judge overrides if provided
            judge_config = test_case.judge_config.copy()
            if judge_overrides:
                judge_config.update(judge_overrides)
                logs.append(f"Applied judge overrides: {list(judge_overrides.keys())}")
            
            # Simulate LLM judge evaluation - replace with actual implementation
            judge_results = {
                "overall_score": 8.2,
                "scores_breakdown": [
                    {
                        "rubric_name": rubric["name"],
                        "score": 8.5,
                        "max_score": rubric.get("max_score", 10.0),
                        "rationale": f"Evaluated based on {rubric['name']} criteria"
                    }
                    for rubric in test_case.scoring_rubrics
                ],
                "judge_rationale": "Overall evaluation completed successfully",
                "judge_confidence": 0.85
            }
            
            logs.append("Judge evaluation completed")
            
        except Exception as e:
            logs.append(f"Judge evaluation failed: {str(e)}")
            execution_result = {
                "test_case_id": test_case_id,
                "status": "error",
                "execution_time": (datetime.now() - start_time).total_seconds(),
                "target_output": target_output,
                "judge_results": None,
                "logs": logs,
                "error_message": f"LLM judge evaluation failed: {str(e)}",
                "executed_at": datetime.now().isoformat()
            }
            
            # Save failed execution for debugging
            test_case.latest_execution = execution_result
            db.upsert(test_case)
            
            raise HTTPException(
                status_code=500,
                detail=f"LLM judge evaluation failed: {str(e)}"
            )
        
        # Check for timeout
        elapsed_time = (datetime.now() - start_time).total_seconds()
        if elapsed_time > execution_timeout:
            logs.append(f"Execution timed out after {elapsed_time:.2f} seconds")
            execution_result = {
                "test_case_id": test_case_id,
                "status": "timeout",
                "execution_time": elapsed_time,
                "target_output": target_output,
                "judge_results": None,
                "logs": logs,
                "error_message": f"Execution timed out after {execution_timeout} seconds",
                "executed_at": datetime.now().isoformat()
            }
            
            # Save timeout execution
            test_case.latest_execution = execution_result
            db.upsert(test_case)
            
            raise HTTPException(
                status_code=408,
                detail=f"Test case execution timed out after {execution_timeout} seconds"
            )
        
        # Success case
        execution_result = {
            "test_case_id": test_case_id,
            "status": "completed",
            "execution_time": elapsed_time,
            "target_output": target_output,
            "judge_results": judge_results,
            "logs": logs,
            "executed_at": datetime.now().isoformat()
        }
        
        # Update test case with latest execution result
        test_case.latest_execution = execution_result
        db.upsert(test_case)
        
        return {"status": True, "data": execution_result}
        
    except HTTPException:
        # Re-raise HTTP exceptions (they're already properly formatted)
        raise
        
    except Exception as e:
        # Handle any unexpected errors
        logs = getattr(locals(), 'logs', ["Test case execution started"])
        logs.append(f"Unexpected error: {str(e)}")
        
        execution_result = {
            "test_case_id": test_case_id,
            "status": "error",
            "execution_time": (datetime.now() - start_time).total_seconds(),
            "target_output": None,
            "judge_results": None,
            "logs": logs,
            "error_message": f"Unexpected error during execution: {str(e)}",
            "executed_at": datetime.now().isoformat()
        }
        
        # Try to save error result if possible
        try:
            if 'test_case' in locals():
                test_case.latest_execution = execution_result
                db.upsert(test_case)
        except:
            pass  # Don't let DB save failure prevent error reporting
        
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error during test case execution: {str(e)}"
        ) 