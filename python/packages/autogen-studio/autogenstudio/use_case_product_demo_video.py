import os

from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.teams import DiGraphBuilder, GraphFlow
from autogen_ext.models.openai import OpenAIChatCompletionClient
import networkx as nx
import matplotlib.pyplot as plt

client = OpenAIChatCompletionClient(
    model="gpt-4o",
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url=os.getenv("OPENAI_BASE_URL")
)

user_input = AssistantAgent(
    name="user_input",
    model_client=client,
    system_message="You handle initial user input for video creation requests."
)

media_preprocessing = AssistantAgent(
    name="media_preprocessing",
    model_client=client,
    system_message="Process and prepare media assets for the video production."
)

highlight_locator = AssistantAgent(
    name="highlight_locator",
    model_client=client,
    system_message="Identify key highlights from the preprocessed media."
)

outline_planner = AssistantAgent(
    name="outline_planner",
    model_client=client,
    system_message="Create a structured outline for the video based on user requirements."
)

video_composer = AssistantAgent(
    name="video_composer",
    model_client=client,
    system_message="Compose the video by integrating highlights, outline, and other components."
)

styling = AssistantAgent(
    name="styling",
    model_client=client,
    system_message="Apply visual styling and aesthetic enhancements to the video."
)

caption_writer = AssistantAgent(
    name="caption_writer",
    model_client=client,
    system_message="Write accurate and engaging captions for the video content."
)

voiceover_generator = AssistantAgent(
    name="voiceover_generator",
    model_client=client,
    system_message="Generate natural-sounding voice-over narration from captions."
)

qa_critic = AssistantAgent(
    name="qa_critic",
    model_client=client,
    system_message="Review the video for quality, accuracy, and alignment with requirements."
)

post_processor = AssistantAgent(
    name="post_processor",
    model_client=client,
    system_message="Finalize the video and prepare it for export in appropriate formats."
)

builder = DiGraphBuilder()

builder.add_node(user_input)\
       .add_node(media_preprocessing)\
       .add_node(highlight_locator)\
       .add_node(outline_planner)\
       .add_node(video_composer)\
       .add_node(styling)\
       .add_node(caption_writer)\
       .add_node(voiceover_generator)\
       .add_node(qa_critic)\
       .add_node(post_processor)

builder.add_edge(user_input, media_preprocessing)
builder.add_edge(user_input, outline_planner)
builder.add_edge(media_preprocessing, highlight_locator)
builder.add_edge(highlight_locator, video_composer)
builder.add_edge(outline_planner, video_composer)
builder.add_edge(video_composer, styling)
builder.add_edge(video_composer, caption_writer)
builder.add_edge(video_composer, qa_critic)
builder.add_edge(caption_writer, voiceover_generator)
builder.add_edge(qa_critic, post_processor)

graph = builder.build()

flow = GraphFlow(
    participants=builder.get_participants(),
    graph=graph,
)

def run_video_production_workflow(user_message):
    builder.set_entry_point(user_input)
    
    return flow.run(user_message)

def visualize_graph(graph_builder):
    """Visualize the graph using NetworkX and Matplotlib."""
    G = nx.DiGraph()
    
    # Add nodes
    for agent in graph_builder.get_participants():
        G.add_node(agent.name)
    
    # Add edges
    for node_name, node in graph_builder.nodes.items():
        for edge in node.edges:
            condition = edge.condition if edge.condition else ""
            G.add_edge(node_name, edge.target, condition=condition)
    
    # Create the plot
    plt.figure(figsize=(12, 8))
    pos = nx.spring_layout(G, seed=42)
    
    # Draw nodes
    nx.draw_networkx_nodes(G, pos, node_size=2000, node_color="lightblue")
    
    # Draw edges
    nx.draw_networkx_edges(G, pos, width=1.5, arrowsize=20)
    
    # Add edge labels (conditions)
    edge_labels = {(u, v): d.get('condition', '') for u, v, d in G.edges(data=True) if d.get('condition')}
    nx.draw_networkx_edge_labels(G, pos, edge_labels=edge_labels)
    
    # Add node labels
    nx.draw_networkx_labels(G, pos, font_size=10)
    
    plt.title("Video Production Workflow Graph")
    plt.axis('off')
    plt.tight_layout()
    plt.savefig("workflow_graph.png")
    plt.show()
    
    print("Graph visualization saved as 'workflow_graph.png'")

if __name__ == "__main__":
    user_request = "Create a product demo video for our new AI-powered smart home device."
    chat_history = run_video_production_workflow(user_request)
    print(chat_history)
    
    # Visualize the graph
    visualize_graph(builder)

