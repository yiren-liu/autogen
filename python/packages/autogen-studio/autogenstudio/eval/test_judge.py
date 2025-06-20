import os
import asyncio
from autogenstudio.datamodel.eval import EvalTask, EvalRunResult, EvalJudgeCriteria
from autogenstudio.eval.judges import LLMEvalJudge
from autogen_agentchat.messages import TextMessage
from autogen_agentchat.base import TaskResult, TeamResult
from autogenstudio.teammanager.teammanager import TeamManager
from autogen_agentchat.base import CancellationToken
from autogen_agentchat.messages import TextMessage, MultiModalMessage, StopMessage, HandoffMessage, ToolCallRequestEvent, ToolCallExecutionEvent
from autogenstudio.datamodel import LLMCallEventMessage, TeamResult

import dotenv
dotenv.load_dotenv()

# Usage example
async def example_usage():
    # Create a model client
    from autogen_ext.models.openai import OpenAIChatCompletionClient

    model_client = OpenAIChatCompletionClient(
        model="gpt-4o",
        api_key=os.getenv("OPENAI_API_KEY"),
        base_url=os.getenv("OPENAI_API_BASE"),
    )

    # Create a judge
    llm_judge = LLMEvalJudge(model_client=model_client)

    # Serialize the judge to a ComponentModel
    judge_config = llm_judge.dump_component()
    print(f"Serialized judge: {judge_config}")

    # Deserialize back to a LLMEvalJudge
    deserialized_judge = LLMEvalJudge.load_component(judge_config)

    # Create criteria for evaluation
    criteria = [
        EvalJudgeCriteria(
            dimension="relevance",
            prompt="Evaluate how relevant the response is to the query.",
            min_value=0,
            max_value=10
        ),
        EvalJudgeCriteria(
            dimension="accuracy",
            prompt="Evaluate the factual accuracy of the response.",
            min_value=0,
            max_value=10
        )
    ]

    # These are mocks
    task = EvalTask(
        id="task-123",
        name="Sample Task",
        description="A sample task for evaluation",
        input="What is the capital of France?"
    )
    result = EvalRunResult(
        status=True,
        result=TaskResult(
            messages=[TextMessage(content="The capital of France is Paris.", source="model")]
        )
    )

    
    # Run the team with example components
    team_manager = TeamManager()
    cancellation_token = CancellationToken()
    async for message in team_manager.run_stream(
        task=task,
        team_config=team_config,
        cancellation_token=cancellation_token,
    ):
        if cancellation_token.is_cancelled():
            logger.info(f"Stream cancelled")
            break

        formatted_message = team_manager._format_message(message)
        if formatted_message:
            print(formatted_message)

            # Save messages by concrete type
            if isinstance(
                message,
                (
                    TextMessage,
                    MultiModalMessage,
                    StopMessage,
                    HandoffMessage,
                    ToolCallRequestEvent,
                    ToolCallExecutionEvent,
                    LLMCallEventMessage,
                ),
            ):
                print(message)
            # Capture final result if it's a TeamResult
            elif isinstance(message, TeamResult):
                final_result = message.model_dump()
                print(final_result)

    # Run the evaluation
    score = await deserialized_judge.judge(task, result, criteria)
    print(f"Evaluation score: {score}")


if __name__ == "__main__":
    asyncio.run(example_usage())