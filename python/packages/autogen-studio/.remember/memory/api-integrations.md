# API Integrations

## Group API Integration

### Backend Group Persistence
**Implementation**:
- Modified `useGraphBuilderStore` to integrate with GroupAPI for persistence
- Added async `createGroup` and `ungroupNodes` functions that call backend APIs
- Added `userId` state tracking in store for API authentication
- Created proper Group data structure mapping from visual nodes/edges to database format

**API Integration Pattern**:
- `createGroup`: Maps visual nodes to GroupNode format with proper type casting and positioning
- `ungroupNodes`: Extracts numeric group ID for API deletion calls
- Error handling: Continues with local operations even if API calls fail
- User context integration: Uses appContext to get userId for API authentication

**Data Structure Mapping**:
- Visual nodes → GroupNode: Maps component configs, positions, and types properly
- Visual edges → GroupEdge: Maps source/target relationships and edge data
- Layout info: Calculates bounding boxes for group positioning
- Type safety: Proper casting of labels and component types for database storage

### Frontend User Context Integration
**SelectionBox Component Updates**:
- Added appContext import and usage for user authentication
- Modified handleGroup and handleUngroup to be async functions
- Added userId synchronization with store on user context changes
- Error handling with console logging while maintaining local functionality

**Authentication Flow**:
- SelectionBox component imports appContext and AppContextType
- useEffect hook syncs user.id with store.userId when user changes
- Store methods check userId availability before making API calls
- Graceful degradation: Local grouping continues even if API fails

## Groups and Test Cases API

### Frontend Implementation (api.ts)
- **GroupAPI class**: Complete CRUD operations for groups with filtering by node_type and search
- **TestCaseAPI class**: Full test case management with execution capabilities
- **Type definitions**: Added Group, TestCase, TestExecutionResult interfaces to datamodel.ts
- **Exports**: groupAPI and testCaseAPI instances for use throughout the application

### Backend Implementation 
#### Database Models (datamodel/db.py)
- **Group model**: SQLModel with name, description, nodes (JSON), edges (JSON), layout_info, tags, is_public, group_version
- **TestCase model**: SQLModel with test metadata, target references, input/output data, assertions, execution settings
- **Exports**: Updated __init__.py to export Group and TestCase models

#### API Routes
- **groups.py**: Complete CRUD endpoints with filtering and search functionality
  - GET /groups/ - List groups with optional node_type and search filters
  - GET /groups/{id} - Get specific group
  - POST /groups/ - Create new group
  - PUT /groups/{id} - Update existing group
  - DELETE /groups/{id} - Delete group
- **test_cases.py**: Test case management endpoints
  - GET /test-cases/ - List test cases with optional group_id/graph_id filters
  - GET /test-cases/{id} - Get specific test case
  - POST /test-cases/ - Create test case
  - PUT /test-cases/{id} - Update test case
  - DELETE /test-cases/{id} - Delete test case
  - POST /test-cases/{id}/execute - Execute test case (placeholder implementation)

#### App Integration (web/app.py)
- **Route registration**: Added groups and test-cases routers to FastAPI application
- **API documentation**: Automatic OpenAPI docs generation for new endpoints
- **Consistent patterns**: Following same auth, error handling, and response patterns as existing APIs

### Implementation Features
- **Filtering support**: Groups can be filtered by node type and search terms
- **User isolation**: All operations scoped to user_id for security
- **Error handling**: Proper HTTP status codes and error messages
- **Data validation**: Pydantic/SQLModel validation for all inputs
- **Database integration**: Uses existing database connection and ORM patterns

## LLM-as-a-Judge Test Case System

### Database Model Redesign (db.py)
**Changed Fields**:
- `test_type` default to "llm_judge" with options: llm_judge, performance, integration
- Removed `input_data`, `expected_output`, `assertions` (old assertion-based testing)
- Added LLM-specific inputs: `context` (scenario background), `input_query` (user prompt), `oracles` (expected/negative examples), `scoring_rubrics` (criteria and ranges)
- Added `judge_config` for LLM model configuration (model, temperature, max_tokens, system_prompt)
- Added `latest_execution` field to store most recent test results with scores and rationales
- Increased default timeout to 120 seconds for LLM processing needs

### API Execution Workflow Redesign (test_cases.py)
**New Execution Flow**:
1. Run target system (group/graph) with input_query and context
2. Collect target_output (response + metadata)
3. Send context, input_query, target_output, oracles, and rubrics to LLM judge
4. Parse judge response for scores, rationales, and confidence
5. Store execution results in test case latest_execution field

**Result Structure**:
- `target_output`: {response: string, metadata: object} - What the system produced
- `judge_results`: {overall_score, scores_breakdown, judge_rationale, judge_confidence} - Judge evaluation
- `scores_breakdown`: Array of {rubric_name, score, max_score, rationale} for each criteria
- Support for judge_overrides parameter to test different evaluation approaches

### Frontend Types Redesign (datamodel.ts)
**New Interfaces**:
- `ScoringRubric`: name, description, max_score, criteria, score_ranges with min/max/description
- `JudgeConfig`: model, temperature, max_tokens, system_prompt
- `TestOracles`: expected_examples, negative_examples, reference_answers arrays
- `JudgeScoreResult`: rubric_name, score, max_score, rationale

**Updated TestCase Interface**:
- Includes context, input_query, oracles, scoring_rubrics, judge_config
- Results stored in latest_execution field for history tracking
- Proper TypeScript typing for all LLM judge evaluation structures

### OpenAPI Specification Update (components.yml)
**Schema Changes**:
- Updated TestCase schema to include LLM judge fields with detailed descriptions
- Added oracles object with expected/negative examples structure
- Added scoring_rubrics array with score ranges and criteria
- Updated TestExecutionResult schema with target_output and judge_results structure
- Changed status enums to reflect LLM evaluation workflow (completed, failed, error, timeout)
- Required fields now include context, input_query, oracles, scoring_rubrics, judge_config

### Key Design Decisions
- **Range-based scoring**: Replaced assertion-based testing with LLM judge scores and rationales
- **Comprehensive context**: Each test includes scenario context, user query, and example responses
- **Flexible rubrics**: Support multiple scoring criteria with defined ranges and descriptions
- **Judge configuration**: Customizable LLM models and parameters for different evaluation needs
- **Execution history**: Store latest results for tracking improvements over time
- **Override support**: Allow testing different judge configurations without modifying test case

### Error Handling Implementation
**Backend Error Handling (test_cases.py)**:
- Comprehensive validation of test case configuration before execution
- Separate error handling for target system execution vs LLM judge evaluation
- Timeout detection with configurable limits
- All errors saved to latest_execution field for debugging
- Proper HTTP status codes: 400 (validation), 404 (not found), 408 (timeout), 500 (execution errors)
- Error logs include detailed failure information and execution timeline

**Frontend Error Handling (api.ts)**:
- Enhanced error types with user-friendly messages: VALIDATION_ERROR, NOT_FOUND_ERROR, TIMEOUT_ERROR, EXECUTION_ERROR, NETWORK_ERROR
- Network error detection for connectivity issues
- Structured error objects with status codes, user messages, and original error context
- TypeScript-safe error handling with proper type guards
- Graceful degradation for different failure scenarios

**Error Data Structure**:
- Failed executions still saved to database with error_message and logs
- TestExecutionResult supports null target_output and judge_results for failure cases
- TestExecutionError interface provides structured error information for UI handling
- Error messages designed for both developer debugging and user feedback 