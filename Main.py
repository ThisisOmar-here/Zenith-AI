import os
from dotenv import load_dotenv
from langchain_qdrant import Qdrant
from langchain_core.documents import Document
from qdrant_client import QdrantClient, models
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_nvidia_ai_endpoints import NVIDIAEmbeddings, ChatNVIDIA
from langchain_core.prompts.chat import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough, RunnableParallel, RunnableLambda
from operator import itemgetter
from langchain.chains import LLMChain
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
import getUsersIP
from prompts import prompts
import math
import logging
from typing import List,Optional


from UserProfile import update_user_profile  # user profile extraction & persistence
from langchain_core.tools import tool
from langchain_core.messages import ToolMessage

# If using Groq with LangChain, you need a Groq wrapper (pseudo-example)
from langchain_groq import ChatGroq

useTTS = False

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

# Load Environment Variables
load_dotenv()

# User Query
#query = input("Enter your question (or type 'exit' to quit): ")

# API keys
api_key_q = os.getenv("API_KEY_Q")
nvidia_api_key = os.getenv("NVIDIA_API_KEY")

#Embeddings
embeddings = NVIDIAEmbeddings(
    base_url='https://integrate.api.nvidia.com/v1',
    model='nvidia/nv-embedqa-e5-v5',
    truncate='END',  # safely cut to 512 tokens if needed
    dimensions=None,
    max_batch_size=50
)

#LLM = ChatNVIDIA(model="openai/gpt-oss-120b", api_key=nvidia_api_key, max_completion_tokens=4096, temperature=0.4)
#Use Groq
LLM = ChatGroq(
    model="openai/gpt-oss-120b",
    temperature=1,
    max_completion_tokens=65536,
    top_p=1,
    reasoning_effort="high",
    tools=[{"type": "browser_search"}],
    api_key=os.getenv("GROQ_API_KEY")
)


#Collection Name
#collection_name = "Anti-anxiety"
collection_name = "knowledge-base"
#Qdrant Client

client = QdrantClient(
    url="https://f91f53a3-5514-4a34-ae7c-435b04046992.europe-west3-0.gcp.cloud.qdrant.io:6333",
    api_key=os.getenv("Qdrant_API_KEY")
)

#client = QdrantClient(":memory:")


#This Function Creates Different Collections Adding
def Create_Collection():
  
    client.recreate_collection(
        collection_name=collection_name,
        vectors_config=models.VectorParams(size=1024, distance=models.Distance.COSINE)
    )

    print(f"Collection {collection_name} created successfully")

def create_payload_index():
    client.create_payload_index(
        collection_name=collection_name,
        field_name="category",
        field_schema="keyword",
    )

#Vector Store
"""
vector_store = Qdrant(
    client=client,
    collection_name=collection_name,
    embeddings=embeddings
)
"""

#DEMO MODE
vector_store = Qdrant(
    client=client,
    collection_name=collection_name,
    embeddings=embeddings

)

def LoadPDFsToVectorStore():
    """
    Walk PDFs/<category>/**/*.pdf
    Sets metadata.category to the folder name (or 'general' if unknown).
    """
    base_dir = "PDFs"
    if not os.path.isdir(base_dir):
        print("No PDFs directory found.")
        return

    total_docs = 0
    indexed_files = 0

    for root, _, files in os.walk(base_dir):
        for fname in files:
            if not fname.lower().endswith(".pdf"):
                continue

            # Infer category from immediate parent folder
            category = os.path.basename(root).lower()

            pdf_path = os.path.join(root, fname)
            loader = PyMuPDFLoader(pdf_path)
            pages = loader.load_and_split()

            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1500,
                chunk_overlap=800,
                length_function=len,
                separators=["\n\n", "\n", ".", " ", ""],
            )

            docs = []
            for idx, page in enumerate(pages):
                texts = text_splitter.split_text(page.page_content)
                for i, chunk in enumerate(texts):
                    if not chunk.strip():
                        continue
                    docs.append(
                        Document(
                            page_content=chunk,
                            metadata={
                                "source": fname,
                                "page_number": page.metadata.get("page", idx + 1),
                                "total_pages": len(pages),
                                "chunk_id": idx,
                                "chunk": i,
                                "category": category  # NEW: topic tag
                            },
                        )
                    )

            if docs:
                vector_store.add_documents(documents=docs)
                total_docs += len(docs)
                indexed_files += 1
                print(f"Indexed {len(docs)} chunks from: {pdf_path} [category={category}]")

    print(f"\nTotal files indexed: {indexed_files}, total chunks: {total_docs}")



# Replace the prompt with one that can optionally include a HyDE block.
prompt = """
You are a careful assistant. Use ONLY the provided material. 
If unsure, say you are unsure. Be concise, use bullet points where helpful.

HyDE Block:
{hyde_block}


Question:
{query} 


Context:
{context}

Answer:
""".strip()


SummrizePrompt = """
You're a wisdom friend to the user someone who understands their feelings and challenges.
Summarize the previous answer in a concise manner, highlighting the key points and insights provided.
Your summary should be clear and easy to understand, capturing the essence of the original response without losing important details.
Don't ask too many questions; Keep just the HQ questions which will help you understand the user's needs, feelings, emotions in a better way.

Important Notes:
    Your responses should not include any disclaimers or caveats about the limitations of your knowledge or abilities.
    Your responses should be deep supportive with compassion and empathy "Not long as it is as deep and motivationg"
    Your responses should not be too long and not too short, just enough to provide a complete answer to the question, etc.
    Acknowledge the user's feelings and experiences, and validate their emotions, BEFORE providing any suggestions or advice.

Summary:
{content}
"""

#chat_prompt = ChatPromptTemplate.from_template(prompt)




def format_docs(docs):
    return "\n\n".join(
        doc.page_content if hasattr(doc, "page_content") else str(doc)
        for doc in docs
    )

def prompts_organizer(user_profile: str):
    # Build the system + usage messages.

    system_message = SystemMessage(content=prompts.SYSTEM_PROMPT_v5)
    Examples_message = SystemMessage(content=prompts.Zoe_Examples)
    DataUsage = SystemMessage(content=prompts.user_data_prompt.format(user_data=user_profile))
    UiPrompt = SystemMessage(content=prompts.UI_Prompt)
    return [system_message, Examples_message, DataUsage, UiPrompt]

# Maintain conversation history across turns (HumanMessage / AIMessage objects)
conversation_history: list = []

# Tunables
TEMPERATURE_SUPPORT = 1
MAX_HISTORY_TOKENS = 4400          # approximate budget for history (before summarization)
MAX_CONTEXT_TOKENS = 5500          # budget for retrieved docs
APPROX_CHARS_PER_TOKEN = 4
MAX_DOCS_INITIAL = 100
MAX_DOCS_FINAL = 20
MIN_DOCS = 3
USERPROFILE = {}

# Topic categories used for tagging
CATEGORIES = [
    "Emotional & Mental Health",
    "Emotional Intelligence & Social Skills",
    "Practical Life Skills",
    "Productivity & Habits",
    "Resilience & Life Perspective",
    "Well-being & Happiness"
]


def HybridDocumentEmbeddings(user_query: str,  hydeprompt: str) -> str:
    """Produce HyDE text with stripped persona to avoid style contamination."""
    try:
        resp = LLM.invoke(hydeprompt.format(user_query=user_query), temperature=0.5)
        hyde_text = resp.content.strip() if hasattr(resp, "content") else str(resp).strip()
        # Light cleanup
        return hyde_text[:1800]
    except Exception as e:
        logging.warning("HyDE generation failed: %s", e)
        return ""

# Lightweight token estimator
def approx_tokens(text: str) -> int:
    return math.ceil(len(text) / APPROX_CHARS_PER_TOKEN)
def summarize_history_if_needed():
    # Compress history when exceeding token budget (excluding latest 2 turns)
    global conversation_history
    if not conversation_history:
        return
    # Rough token count
    total = sum(approx_tokens(m.content) for m in conversation_history)
    if total <= MAX_HISTORY_TOKENS:
        return

    # Keep last 2 exchanges (4 messages if both Human+AI)
    preserved = []
    kept = []
    # Collect last 4 messages (2 turns)
    turn_cut = 0
    for msg in reversed(conversation_history):
        kept.append(msg)
        if isinstance(msg, HumanMessage):
            turn_cut += 1
            if turn_cut == 2:
                break
    kept = list(reversed(kept))
    earlier = conversation_history[: len(conversation_history) - len(kept)]
    # Summarize earlier history
    summary_prompt = prompts.SummrizePrompt.format(content="\n\n".join(m.content for m in earlier))
    summary_msg = LLM.invoke([SystemMessage(content="Summarize prior dialogue neutrally for internal memory only."), HumanMessage(content=summary_prompt)])
    summary_content = summary_msg.content.strip()
    compressed = AIMessage(content=f"Conversation_Summary: {summary_content}")
    conversation_history = [compressed, *kept]
    logging.info("History compressed. New length: %d messages", len(conversation_history))

def hybrid_query_variants(user_query: str, hyde_text: str) -> List[str]:
    # Basic expansion: original, HyDE first paragraph, merged combo
    hyde_first = hyde_text.split("\n")[0][:700]
    variants = [user_query.strip()]
    if hyde_first:
        variants.append(hyde_first)
    variants.append(f"{user_query.strip()} || {hyde_first}")
    # Deduplicate
    seen = set()
    uniq = []
    for v in variants:
        if v not in seen:
            uniq.append(v)
            seen.add(v)
    return uniq

def retrieve_and_rerank(user_query: str, hyde_text: str, qdrant_filter: Optional[models.Filter] = None):
    """
    Fast path with MMR + optional category filter.
    """
    retriever = vector_store.as_retriever(
        search_type="mmr",
        search_kwargs={
            "k": MAX_DOCS_INITIAL,
            "fetch_k": 40,
            "lambda_mult": 0.35,
            "filter": qdrant_filter,  # NEW
        },
        embeddings=embeddings,
    )

    variants = [user_query.strip()]
    if hyde_text:
        first_line = hyde_text.split("\n", 1)[0][:500]
        if first_line and first_line.lower() != user_query.strip().lower():
            variants.append(first_line)

    gathered: List[Document] = []
    for v in variants:
        try:
            docs = retriever.invoke(v)
            gathered.extend(docs)
        except Exception as e:
            logging.warning("Retriever failure (%s): %s", v, e)

    seen_meta = set()
    uniq_docs = []
    for d in gathered:
        key = (d.metadata.get("source"), d.metadata.get("chunk"), d.page_content[:60])
        if key not in seen_meta:
            uniq_docs.append(d)
            seen_meta.add(key)

    return uniq_docs[:MAX_DOCS_FINAL]

def build_context(docs: List[Document], token_budget: int) -> str:
    assembled = []
    total = 0
    for d in docs:
        chunk_text = d.page_content.strip()
        header = f"[Source: {d.metadata.get('source')} p{d.metadata.get('page_number')} c{d.metadata.get('chunk')}]"
        block = header + "\n" + chunk_text
        t = approx_tokens(block)
        if total + t > token_budget:
            break
        assembled.append(block)
        total += t
    return "\n\n---\n\n".join(assembled)

    situation = TinyLLM.invoke([SystemMessage(content=prompt), HumanMessage(content=userquery)])

    # Analyze the user query to determine the situation
    if "urgent" in situation.content.lower():
        return "urgent"
    
    elif "casual" in situation.content.lower():
        return "casual"
    
    else:
        return "support"

def run_retrieval_pipeline(user_query: str):
    """
    HyDE + optional category classification + retrieval.
    Always returns a 3-tuple: (context_text:str, docs_used:List[Document], category_used:str).
    If category resolves to 'None', returns HyDE-only context to avoid empty/invalid filters.
    """
    try:
    
        # Generate HyDE text up front
        hyde_text = HybridDocumentEmbeddings(user_query, prompts.hyde_prompt) if user_query else ""

        docs = retrieve_and_rerank(user_query, hyde_text)

        # If retrieval is sparse, append HyDE as a synthetic doc
        if (not docs or len(docs) < MIN_DOCS) and hyde_text:
            synthetic_doc = Document(
                page_content=hyde_text,
                metadata={"source": "HyDE_virtual", "page_number": "-", "chunk": "-", "category": cat},
            )
            docs.append(synthetic_doc)

        context = build_context(docs, token_budget=MAX_CONTEXT_TOKENS) if docs else (hyde_text or "")
        return context, docs

    except Exception:
        # Robust fallback: HyDE full informative answer
        try:
            hyde_answer = HybridDocumentEmbeddings(user_query, prompts.hyde_prompt_full_informative_answer)
            return (hyde_answer or "NO_RESULTS"), [], "None"
        except Exception:
            return "NO_RESULTS", [], "None"

retrieve_docs_des = """
Use to find relevant passages from trusted books and articles when the user query 
indicates they need help, advice, or information in any of these areas:
    Emotional & Mental Health,
    Emotional Intelligence & Social Skills,
    Practical Life Skills,
    Productivity & Habits,
    Resilience & Life Perspective,
    Well-being & Happiness

Don't use for other topics, or for Real-time data (news, weather, stock prices, etc).
    
Output is a text block of relevant excerpts, or 'NO_RESULTS' if nothing found. 
Do NOT repeat this text verbatim in your final answer; instead, use it to inform your response naturally, 
the books are about personal development and productivity, and life improvement.

"""
@tool(description=retrieve_docs_des)
def retrieve_docs(query: str) -> str:

    context, _docs= run_retrieval_pipeline(query)
    if not context:
        return "NO_RESULTS"
    return context

iptool_des ="""
    Tool: get_user_ip_location
    Description: Detects the user's public IP address and returns a coarse geolocation
    (country/region/city/lat/lon/timezone). Uses ipify + ipinfo/ipapi under the hood.
    Input: Empty string (ignored).
    Output: JSON string with fields: ip, city, region, country, latitude, longitude, timezone, org, asn, source.
    """
@tool(description=iptool_des)
def get_user_ip_location(_: str = "") -> str:
    import json
    """
    Tool: get_user_ip_location
    Description: Detects the user's public IP address and returns a coarse geolocation
    (country/region/city/lat/lon/timezone). Uses ipify + ipinfo/ipapi under the hood.
    Input: Empty string (ignored).
    Output: JSON string with fields: ip, city, region, country, latitude, longitude, timezone, org, asn, source.
    """
    try:
        info = getUsersIP.get_user_ip_location_data()
        return json.dumps(info)
    
    except Exception as e:
    
        return json.dumps({"error": f"Location lookup failed: {e}"})

user_profile_tool_des = """
    This function retrieves the user's profile information use it when you need to understand the user's background, issues, or preferences.
    Retrieve the stored user profile from 'user_profile.json' if it exists.
    Returns a dict with keys: name, age, role, issues, feelings, notes, tone, writing, other.
    If the file does not exist or is invalid, returns an empty dict.
    """
@tool(description=user_profile_tool_des)
def get_users_profile(_: str = "") -> dict:
   
    import json
    profile_path = "user_profile.json"
    if os.path.isfile(profile_path):
        try:
            with open(profile_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
        except Exception:
            pass
    return {}


def get_usersprofile():
   
    import json
    profile_path = "user_profile.json"
    if os.path.isfile(profile_path):
        try:
            with open(profile_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
        except Exception:
            pass
    return {}

# Bind tools to LLM (auto tool calling)
LLM_WITH_TOOLS = LLM.bind_tools([retrieve_docs, get_user_ip_location, get_users_profile])  # tool_choice='auto' default

def AnswerQes(query: str):
    summarize_history_if_needed()
    global USERPROFILE

    if USERPROFILE == {}:
        USERPROFILE = get_usersprofile()
        print(f"User profile: {USERPROFILE}")


    # Base system + usage messages (no pre‑retrieval context injected now)
    prompt_messages = prompts_organizer(USERPROFILE)  # context empty first pass
    first_pass_messages = [*prompt_messages, *conversation_history, HumanMessage(content=query)]

    # First LLM pass (may or may not call tool)
    model_response = LLM_WITH_TOOLS.invoke(first_pass_messages, temperature=TEMPERATURE_SUPPORT)

    tool_used = False
    docs = []
    final_answer_content = ""

    tool_calls = getattr(model_response, "tool_calls", None)
    if tool_calls:
        # Execute each tool call (we only expect one here)
        tool_msgs = []
        for tc in tool_calls:
            try:
                if tc["name"] == "retrieve_docs":
                    print("Tool 'retrieve_docs' called.")

                    tool_used = True
                    retrieved_context = retrieve_docs.invoke({"query": query})
                    tool_msgs.append(
                        ToolMessage(
                            content=retrieved_context,
                            tool_call_id=tc["id"]
                        )
                    )
                if tc["name"] == "get_user_ip_location":
                    print("Tool 'get_user_ip_location' called.")

                    ip_location = get_user_ip_location.invoke("")
                    tool_msgs.append(
                        ToolMessage(
                            content=ip_location,
                            tool_call_id=tc["id"]
                        )
                    )
                if tc["name"] == "get_users_profile":
                    print("Tool 'get_users_profile' called.")

                    user_profile = get_users_profile.invoke("")
                    tool_msgs.append(
                        ToolMessage(
                            content=user_profile,
                            tool_call_id=tc["id"]
                        )
                    )

                if tc["name"] not in ["retrieve_docs", "get_user_ip_location", "get_users_profile"]:
                    print("Unknown tool called: %s", tc["name"])
            except Exception:
                pass

        # Second pass with tool outputs included; ask model for final answer
        followup_messages = [*first_pass_messages, model_response, *tool_msgs]
        
        # Provide explicit instruction to use tool context
        #followup_messages.append(SystemMessage(content="Use retrieved context judiciously. If NO_RESULTS, answer from general reasoning; otherwise ground answer."))
        final = LLM.invoke(followup_messages, temperature=TEMPERATURE_SUPPORT)
        final_answer_content = final.content if hasattr(final, "content") else str(final)
    
    else:
        # No tool call chosen -> treat model_response as final answer
        final_answer_content = model_response.content

    # Update history
    conversation_history.extend([
        HumanMessage(content=query),
        AIMessage(content=final_answer_content)
    ])

    # Update user's profile
    try:
        profile = update_user_profile(conversation_history, LLM)
    except Exception as e:
        pass

    return final_answer_content


# --- GUI Demo Function (self‑contained imports) --
    # Only run the interactive / GUI demo when executing this file directly.
    try:
        if client.collection_exists(collection_name):
            print(f"Collection {collection_name} already exists. Skipping creation.")
            demo_res()
        else:
            print(f"Collection {collection_name} does not exist. Creating and loading data.")
            Create_Collection()
            create_payload_index()
            LoadPDFsToVectorStore()
            demo_res()
    except Exception as e:
        logging.error("Startup failed: %s", e)

    # Uncomment for CLI usage
    # query = input("Enter your question (or type 'exit' to quit): ").strip()
    # while query.lower() != 'exit':
    #     AnswerQes(query=query.strip())
    #     query = input("Enter your question (or type 'exit' to quit): ").strip()