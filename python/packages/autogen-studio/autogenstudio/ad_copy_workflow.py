import os

from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.teams import DiGraphBuilder, GraphFlow
from autogen_ext.models.openai import OpenAIChatCompletionClient, AzureOpenAIChatCompletionClient
import networkx as nx
import matplotlib.pyplot as plt
import dotenv
dotenv.load_dotenv()

# Initialize the OpenAI client
model_client = AzureOpenAIChatCompletionClient(
    model="gpt-4o",
    api_key=os.getenv("OPENAI_API_KEY"),
    azure_endpoint=os.getenv("OPENAI_API_BASE"),
    api_version=os.getenv("OPENAI_API_VERSION")
)
# Create agents for each step in the workflow
brief_parser = AssistantAgent(
    name="brief_parser",
    model_client=model_client,
    system_message="Parse product specifications, campaign goals, and constraints from client briefs."
)

audience_profiler = AssistantAgent(
    name="audience_profiler",
    model_client=model_client,
    system_message="Analyze target audience demographics and psychographics to identify pain-points and motivations."
)

value_distiller = AssistantAgent(
    name="value_distiller",
    model_client=model_client,
    system_message="Extract and distill key benefits and differentiators from product information."
)

concept_smith = AssistantAgent(
    name="concept_smith",
    model_client=model_client,
    system_message="Generate creative big-idea angles and thematic hooks for ad campaigns."
)

headline_gen = AssistantAgent(
    name="headline_gen",
    model_client=model_client,
    system_message="Create multiple compelling headline variants for each concept."
)

copy_writer = AssistantAgent(
    name="copy_writer",
    model_client=model_client,
    system_message="Develop long-form body copy and call-to-action lines that align with headlines."
)

tone_guard = AssistantAgent(
    name="tone_guard",
    model_client=model_client,
    system_message="Enforce brand voice, check for banned words, and ensure appropriate sentiment."
)

reg_checker = AssistantAgent(
    name="reg_checker",
    model_client=model_client,
    system_message="Verify legal and industry compliance (e.g., FDA, FINRA) in all copy."
)

localizer = AssistantAgent(
    name="localizer",
    model_client=model_client,
    system_message="Translate and culturally adapt copy blocks for international markets."
)

perf_predictor = AssistantAgent(
    name="perf_predictor",
    model_client=model_client,
    system_message="Predict click-through rates and engagement metrics for copy variants."
)

reviewer_agent = AssistantAgent(
    name="reviewer_agent",
    model_client=model_client,
    system_message="Simulate or collect feedback from brand managers and stakeholders."
)

packager = AssistantAgent(
    name="packager",
    model_client=model_client,
    system_message="Bundle approved variants and metadata into final deliverable formats (CSV/JSON)."
)

# Build the workflow graph
builder = DiGraphBuilder()

# Add all nodes
builder.add_node(brief_parser)\
       .add_node(audience_profiler)\
       .add_node(value_distiller)\
       .add_node(concept_smith)\
       .add_node(headline_gen)\
       .add_node(copy_writer)\
       .add_node(tone_guard)\
       .add_node(reg_checker)\
       .add_node(localizer)\
       .add_node(perf_predictor)\
       .add_node(reviewer_agent)\
       .add_node(packager)

# Add main flow edges
builder.add_edge(brief_parser, audience_profiler)
builder.add_edge(audience_profiler, value_distiller)
builder.add_edge(value_distiller, concept_smith)
builder.add_edge(concept_smith, headline_gen)
builder.add_edge(concept_smith, copy_writer)
builder.add_edge(headline_gen, tone_guard)
builder.add_edge(copy_writer, tone_guard)
builder.add_edge(tone_guard, reg_checker)
builder.add_edge(reg_checker, localizer)
builder.add_edge(localizer, perf_predictor)
builder.add_edge(perf_predictor, reviewer_agent)
builder.add_edge(reviewer_agent, packager)

# Add feedback loops
builder.add_edge(perf_predictor, headline_gen)
builder.add_edge(reg_checker, copy_writer)

# Build the graph
graph = builder.build()

# Create the workflow
flow = GraphFlow(
    participants=builder.get_participants(),
    graph=graph,
)

def run_ad_copy_workflow(brief):
    """Run the ad copy generation workflow with the given brief."""
    builder.set_entry_point(brief_parser)
    
    return flow.run(brief)

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
    plt.figure(figsize=(14, 10))
    pos = nx.spring_layout(G, seed=42)
    
    # Draw nodes
    nx.draw_networkx_nodes(G, pos, node_size=2000, node_color="lightblue")
    
    # Draw edges
    nx.draw_networkx_edges(G, pos, width=1.5, arrowsize=20)
    
    # Highlight feedback loops
    feedback_edges = [
        (u, v) for (u, v) in G.edges() 
        if (u == "perf_predictor" and v == "headline_gen") or 
           (u == "reg_checker" and v == "copy_writer")
    ]
    nx.draw_networkx_edges(
        G, pos, edgelist=feedback_edges, width=2.0, 
        edge_color="red", style="dashed", arrowsize=25
    )
    
    # Add edge labels (conditions)
    edge_labels = {(u, v): d.get('condition', '') for u, v, d in G.edges(data=True) if d.get('condition')}
    nx.draw_networkx_edge_labels(G, pos, edge_labels=edge_labels)
    
    # Add node labels
    nx.draw_networkx_labels(G, pos, font_size=10)
    
    plt.title("Ad Copy Generation Workflow")
    plt.axis('off')
    plt.tight_layout()
    plt.savefig("ad_copy_workflow_graph.png")
    plt.show()
    
    print("Graph visualization saved as 'ad_copy_workflow_graph.png'")

if __name__ == "__main__":
    sample_brief = """
    Product: EcoSmart Home Battery
    Campaign Goals: Launch a new residential battery storage system that pairs with solar panels
    Target Audience: Homeowners 35-65, environmentally conscious, tech-savvy
    Key Features: 
    - 10kWh capacity with stackable units
    - Smart home integration
    - 10-year warranty
    - 30% more efficient than competitors
    - Qualifies for federal tax credit
    Budget: $250,000
    Timeline: Launch in Q2 2023
    Constraints: Cannot make direct price comparisons to named competitors
    """
    
    # Visualize the workflow graph
    visualize_graph(builder) 
    
    chat_history = run_ad_copy_workflow(sample_brief)
    print(chat_history)