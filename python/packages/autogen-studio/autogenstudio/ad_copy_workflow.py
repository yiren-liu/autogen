import os

from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.teams import DiGraphBuilder, GraphFlow
from autogen_ext.models.openai import OpenAIChatCompletionClient, AzureOpenAIChatCompletionClient
import networkx as nx
import matplotlib.pyplot as plt
import dotenv
dotenv.load_dotenv()

# Initialize the OpenAI client
model_client = OpenAIChatCompletionClient(
    model="gpt-4o",
    # api_key=os.getenv("OPENAI_API_KEY"),
    # base_url=os.getenv("OPENAI_API_BASE"),
    # api_version=os.getenv("OPENAI_API_VERSION")
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

    # Create agents for each step in the workflow
    need_analysis = AssistantAgent(
        name="need_analysis",
        model_client=model_client,
        system_message="Analyze the user's needs and preferences to determine the best way to meet their needs."
    )
    social_analyst = AssistantAgent(
        name="social_analyst",
        model_client=model_client,
        system_message="Analyze the user's social media presence and preferences to determine the best way to meet their needs."
    )
    user_data_analyst = AssistantAgent(
        name="user_data_analyst",
        model_client=model_client,
        system_message="Analyze the user's data to determine the best way to meet their needs."
    )
    concept_ideation = AssistantAgent(
        name="concept_ideation",
        model_client=model_client,
        system_message="Generate a concept for the user's needs."
    )
    campaign_mgr = AssistantAgent(
        name="campaign_mgr",
        model_client=model_client,
        system_message="Manage the campaign and ensure it is on track to meet the user's needs."
    )
    email_gen = AssistantAgent(
        name="email_gen",
        model_client=model_client,
        system_message="Generate an email for the user's needs."
    )
    tv_planner = AssistantAgent(
        name="tv_planner",
        model_client=model_client,
        system_message="Plan the TV campaign for the user's needs."
    )
    website_gen = AssistantAgent(
        name="website_gen",
        model_client=model_client,
        system_message="Generate a website for the user's needs."
    )
    headline_gen = AssistantAgent(
        name="headline_gen",
        model_client=model_client,
        system_message="Generate a headline for the user's needs."
    )
    localizer = AssistantAgent(
        name="localizer",
        model_client=model_client,
        system_message="Localize the ad copy for the user's needs."
    )
    stakeholder_review = AssistantAgent(
        name="stakeholder_review",
        model_client=model_client,
        system_message="Review ideas and say 'REVISE' and provide feedbacks, or 'APPROVE' for final approval."
    )
    output_sink = AssistantAgent(
        name="output_sink",
        model_client=model_client,
        system_message="Output the ad copy for the user's needs as a comprehensive report."
    )


    # Build the workflow graph
    builder = DiGraphBuilder()

    # Add all nodes
    builder\
        .add_node(need_analysis)\
        .add_node(social_analyst)\
        .add_node(user_data_analyst)\
        .add_node(concept_ideation)\
        .add_node(campaign_mgr)\
        .add_node(email_gen)\
        .add_node(tv_planner)\
        .add_node(website_gen)\
        .add_node(headline_gen)\
        .add_node(localizer)\
        .add_node(stakeholder_review)\
        .add_node(output_sink)

    # Add main flow edges
    ## conditional edges
    builder.add_edge(social_analyst,  need_analysis,   condition="UPDATE")
    builder.add_edge(user_data_analyst, need_analysis, condition="UPDATE")
    builder.add_edge(stakeholder_review, campaign_mgr, condition="REVISE")
    builder.add_edge(stakeholder_review, output_sink,  condition="SUBMIT")

    ## unconditional edges
    builder.add_edge(need_analysis,        concept_ideation)
    builder.add_edge(concept_ideation,     campaign_mgr)

    builder.add_edge(need_analysis,        social_analyst)
    builder.add_edge(need_analysis,        user_data_analyst)

    builder.add_edge(campaign_mgr,         email_gen)
    builder.add_edge(campaign_mgr,         tv_planner)
    builder.add_edge(campaign_mgr,         website_gen)
    builder.add_edge(campaign_mgr,         headline_gen)

    builder.add_edge(tv_planner,           website_gen)

    builder.add_edge(campaign_mgr,         localizer)
    builder.add_edge(localizer,            stakeholder_review)

    builder.add_edge(campaign_mgr,         stakeholder_review)



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

    builder.set_entry_point(need_analysis)

    # Build the graph
    graph = builder.build()

    # Create the workflow
    flow = GraphFlow(
        participants=builder.get_participants(),
        graph=graph,
    )
    
    chat_history = run_ad_copy_workflow(sample_brief)
    print(chat_history)