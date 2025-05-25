import asyncio
import os

from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.teams import DiGraphBuilder, GraphFlow
from autogen_ext.models.openai import OpenAIChatCompletionClient, AzureOpenAIChatCompletionClient

import dotenv
dotenv.load_dotenv()

async def main():
    # Initialize agents with OpenAI model clients.
    model_client = AzureOpenAIChatCompletionClient(
        model="gpt-4o",
        api_key=os.getenv("OPENAI_API_KEY"),
        azure_endpoint=os.getenv("OPENAI_API_BASE"),
        api_version=os.getenv("OPENAI_API_VERSION")
    )
    agent_a = AssistantAgent("A", model_client=model_client, system_message="You are a helpful assistant.")
    agent_b = AssistantAgent("B", model_client=model_client, system_message="Translate input to Chinese.")
    agent_c = AssistantAgent("C", model_client=model_client, system_message="Translate input to Japanese.")

    # Create a directed graph with fan-out flow A -> (B, C).
    builder = DiGraphBuilder()
    builder.add_node(agent_a).add_node(agent_b).add_node(agent_c)
    builder.add_edge(agent_a, agent_b).add_edge(agent_a, agent_c)
    graph = builder.build()

    # Create a GraphFlow team with the directed graph.
    team = GraphFlow(
        participants=[agent_a, agent_b, agent_c],
        graph=graph,
    )

    # Run the team and print the events.
    async for event in team.run_stream(task="Write a short story about a cat."):
        print(event)


asyncio.run(main())