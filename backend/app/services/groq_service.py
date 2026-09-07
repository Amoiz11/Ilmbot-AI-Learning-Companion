import os
import logging
import httpx

logger = logging.getLogger(__name__)

# Custom Exception Types for Groq Service
class GroqServiceException(Exception):
    """Base exception for Groq service errors."""
    pass

class GroqRateLimitError(GroqServiceException):
    """Raised when Groq API returns HTTP 429 Rate Limit."""
    pass

class GroqTimeoutError(GroqServiceException):
    """Raised when Groq API request times out."""
    pass

class GroqAPIError(GroqServiceException):
    """Raised on connection failures, non-2xx statuses, or invalid response formats."""
    pass

# System Prompts
LEARNING_COACH_SYSTEM_PROMPT = (
    "You are IlmBot Learning Coach, an expert academic AI tutor. "
    "Provide step-by-step explanations, beginner-friendly language, clear structure "
    "with numbered steps and headers where useful, concrete real-world examples, and an encouraging tutor tone. "
    "CRITICAL: Never return unformatted raw text dumps — always structure your response clearly using markdown, bold headers, and bullet points or numbered lists. "
    "Format all mathematical equations and formulas using standard LaTeX: use $...$ for inline math (e.g. $x = 5$, $\\pi$, $m_1$) and $$...$$ on their own lines for display equations (e.g. $$\\frac{a}{b}$$). "
    "Never use the slang acronym or marker 'TL;DR' in headers or summaries; use clean titles like 'Summary' or 'Key Takeaways' instead."
)

CODING_COACH_SYSTEM_PROMPT = (
    "You are IlmBot Coding Coach, an expert AI programming mentor. "
    "Explain programming concepts clearly, provide well-commented code examples in fenced markdown code blocks (e.g. ```python ... ```), "
    "explain code line-by-line when relevant, help debug syntax and logic errors when the user pastes code or error messages, and suggest modern best practices. "
    "When mathematical expressions are needed, format them using LaTeX ($...$ for inline, $$...$$ for display equations). "
    "Never use the slang acronym or marker 'TL;DR' in headers or summaries; use clean titles like 'Summary' or 'Key Takeaways' instead."
)

CODING_ROUTING_CLASSIFIER_PROMPT = (
    "You are a domain classifier for Coding Coach (an AI programming mentor). "
    "Classify whether the user's message or attached image content is an academic or non-coding topic (such as mathematics, science, physics, biology, chemistry, history, literature, or general studies) "
    "that would be better suited for Learning Coach (an academic tutor), rather than programming, software engineering, or computer algorithms. "
    "Reply with ONLY one word: SWITCH if it is an academic non-coding topic, or STAY if it is about coding, software, debugging, computer science, or general greetings."
)

LEARNING_ROUTING_CLASSIFIER_PROMPT = (
    "You are a domain classifier for Learning Coach (an AI academic tutor). "
    "Classify whether the user's message, attached image content, or document excerpts are specifically a programming, coding, software development, syntax, DSA, or code debugging topic "
    "that would be better suited for Coding Coach (a programming mentor). "
    "Reply with ONLY one word: SWITCH if it is a coding/programming topic, or STAY if it is a general academic topic, school subject, or general greetings."
)

TITLE_GENERATION_SYSTEM_PROMPT = (
    "You are a title generation assistant. Output ONLY a concise, natural conversation title "
    "(roughly 3 to 6 words) summarizing the user's input. "
    "Do NOT use quotation marks, do NOT include a trailing period, and do NOT explain your output. "
    "Example input: 'Describe me loops in python' -> Example title: Python Loops Explained"
)

def fallback_title(first_message: str) -> str:
    """Fallback title generator using clean 50-character word-boundary truncation."""
    if not first_message:
        return "New Conversation"
    clean = first_message.strip().replace('\n', ' ')
    if len(clean) <= 50:
        return clean
    truncated = clean[:50].rsplit(' ', 1)[0]
    return (truncated + "...") if truncated else (clean[:50] + "...")

async def generate_conversation_title(first_message: str) -> str:
    """
    Generate a short, smart AI title for a new conversation via minimal Groq API call.
    Falls back to fallback_title() on timeout, rate limit, or any API failure.
    """
    if not first_message or not first_message.strip():
        logger.info("[TITLE GEN] Empty first message, using default title.")
        return "New Conversation"

    groq_api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not groq_api_key or groq_api_key == "your_key_here":
        logger.warning("[TITLE GEN] GROQ_API_KEY missing or invalid, triggering fallback.")
        return fallback_title(first_message)

    target_model = os.getenv("GROQ_TITLE_MODEL", "groq/compound-mini").strip() or "groq/compound-mini"
    url = "https://api.groq.com/openai/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {groq_api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": target_model,
        "messages": [
            {"role": "system", "content": TITLE_GENERATION_SYSTEM_PROMPT},
            {"role": "user", "content": first_message.strip()}
        ],
        "temperature": 0.3,
        "max_tokens": 150
    }

    msg = f"[TITLE GEN] Requesting AI title from Groq ({target_model}) for prompt: '{first_message[:35]}...'"
    logger.info(msg)
    print(msg, flush=True)

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code == 200:
                data = response.json()
                raw_title = data["choices"][0]["message"].get("content", "").strip()

                # Clean any thinking tags if returned
                if "<think>" in raw_title and "</think>" in raw_title:
                    raw_title = raw_title.split("</think>")[-1].strip()

                cleaned_title = raw_title.strip('"\'`').rstrip('.').strip()
                if cleaned_title and len(cleaned_title) <= 80:
                    success_msg = f"[TITLE GEN] AI title generated successfully: '{cleaned_title}'"
                    logger.info(success_msg)
                    print(success_msg, flush=True)
                    return cleaned_title
                else:
                    warn_msg = "[TITLE GEN] AI content was empty (reasoning tokens exceeded max_tokens), using fallback."
                    logger.warning(warn_msg)
                    print(warn_msg, flush=True)
            else:
                warn_msg = f"[TITLE GEN] Groq returned HTTP {response.status_code}, using fallback."
                logger.warning(warn_msg)
                print(warn_msg, flush=True)
    except Exception as err:
        err_msg = f"[TITLE GEN] Exception occurred during AI title generation: {err}"
        logger.warning(err_msg)
        print(err_msg, flush=True)

    fallback = fallback_title(first_message)
    fallback_msg = f"[TITLE GEN] Fallback title generated: '{fallback}'"
    logger.info(fallback_msg)
    print(fallback_msg, flush=True)
    return fallback

async def get_groq_response(messages: list[dict], model: str | None = None) -> str:
    """
    Send messages array to Groq API (https://api.groq.com/openai/v1/chat/completions)
    and return assistant reply content string.
    """
    groq_api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not groq_api_key or groq_api_key == "your_key_here":
        logger.warning("GROQ_API_KEY is missing or set to placeholder value.")
        raise GroqAPIError("GROQ_API_KEY is not configured in backend/.env file.")

    target_model = model or os.getenv("GROQ_MODEL", "openai/gpt-oss-120b").strip() or "openai/gpt-oss-120b"
    url = "https://api.groq.com/openai/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {groq_api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": target_model,
        "messages": messages,
        "temperature": 0.7
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json=payload)

            if response.status_code == 429:
                logger.warning("Groq API HTTP 429 Rate Limit hit.")
                raise GroqRateLimitError("AI service rate limit exceeded.")

            if response.status_code != 200:
                logger.error("Groq API HTTP %s: %s", response.status_code, response.text)
                raise GroqAPIError(f"Groq API returned status code {response.status_code}.")

            data = response.json()
            try:
                content = data["choices"][0]["message"]["content"]
                if not content:
                    raise GroqAPIError("Groq response content was empty.")
                return content
            except (KeyError, IndexError, TypeError) as parse_err:
                logger.error("Groq response parsing failure: %s", parse_err)
                raise GroqAPIError("Invalid response format from Groq API.")

    except httpx.TimeoutException as timeout_err:
        logger.warning("Groq API call timed out: %s", timeout_err)
        raise GroqTimeoutError("Request to Groq API timed out.")
    except httpx.RequestError as req_err:
        logger.error("Groq API network request error: %s", req_err)
        raise GroqAPIError(f"Network error connecting to Groq API: {req_err}")


async def classify_routing(coach_type: str, user_message: str) -> bool:
    """
    Lightweight Groq call to classify whether the user's message belongs in the current coach
    or should be routed to the other coach.
    Returns True if SWITCH is recommended, False otherwise.
    Fails gracefully returning False on any error or timeout.
    """
    if not user_message or not user_message.strip():
        return False

    groq_api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not groq_api_key or groq_api_key == "your_key_here":
        return False

    # Default to fast, low-latency openai/gpt-oss-20b for routing classifications
    target_model = os.getenv("GROQ_ROUTING_MODEL", "openai/gpt-oss-20b").strip() or "openai/gpt-oss-20b"
    system_prompt = CODING_ROUTING_CLASSIFIER_PROMPT if coach_type == "coding" else LEARNING_ROUTING_CLASSIFIER_PROMPT

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {groq_api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": target_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message.strip()}
        ],
        "temperature": 0.0,
        "max_tokens": 150
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code == 200:
                data = response.json()
                msg = data["choices"][0]["message"]
                raw_content = (msg.get("content") or "").strip()
                raw_reasoning = (msg.get("reasoning") or "").strip()
                combined = f"{raw_content} {raw_reasoning}".upper()

                if "SWITCH" in raw_content.upper():
                    return True
                # Fallback for reasoning models if content was empty or truncated
                if "SWITCH" in combined and "STAY" not in raw_content.upper():
                    if any(phrase in combined for phrase in ['"SWITCH"', "'SWITCH'", "OUTPUT SWITCH", "REPLY SWITCH", "IS SWITCH", "SAY SWITCH"]):
                        return True
                return False
            else:
                logger.warning("Routing classification HTTP %s: %s", response.status_code, response.text)
                return False
    except Exception as exc:
        logger.warning("Routing classification call failed: %s", exc)
        return False


PROGRAMMING_PATTERNS = [
    r"\bdef\s+\w+\(", r"\bclass\s+\w+", r"\bimport\s+\w+", r"\bfrom\s+\w+\s+import",
    r"\bpublic\s+(?:class|static|void)", r"#include\s*<", r"\bstd::", r"\bcout\s*<<",
    r"\bfunction\s+\w*\(", r"\bconst\s+\w+\s*=", r"\blet\s+\w+\s*=", r"\bvar\s+\w+\s*=",
    r"\bSystem\.out\.print", r"\bconsole\.log\(",
    r"\b(array|linked\s*list|binary\s*tree|recursion|dynamic\s*programming|stack|queue|hash\s*map|time\s*complexity|o\([n1]\)|quicksort|mergesort)\b",
    r"\b(python|javascript|typescript|c\+\+|java|golang|rust|swift|kotlin|sql|regex|html|css|leetcode|algorithm|algorithms)\b",
    r"\b(programming|coding|code|developer|software\s*engineering|debugging|syntax|loops?|variables?|functions?|methods?|classes|object-oriented|oop|compiler|runtime)\b",
    r"\b(for\s+\w+\s+in|while\s+|if\s+__name__|print\(|return\s+)",
]


def analyze_coding_signals(text: str) -> int:
    """Count programming keyword / syntax pattern occurrences in text."""
    if not text:
        return 0
    import re
    lower_text = text.lower()
    score = 0
    for pat in PROGRAMMING_PATTERNS:
        matches = re.findall(pat, lower_text, re.IGNORECASE)
        score += len(matches)
    return score


async def evaluate_pdf_coding_intent(user_query: str, retrieved_chunk_texts: list) -> bool:
    """
    Hybrid decision engine for PDF routing:
    Combines:
    1. Retrieved PDF chunks / content analysis
    2. User query analysis
    3. LLM classifier result
    """
    chunk_samples = []
    for ct in (retrieved_chunk_texts or []):
        if ct and str(ct).strip():
            chunk_samples.append(str(ct).strip()[:800])
    combined_chunks = "\n---\n".join(chunk_samples)
    full_sample = f"User query: {user_query}\nPDF excerpts:\n{combined_chunks[:2500]}".strip()

    chunk_signal_score = analyze_coding_signals(combined_chunks)
    query_signal_score = analyze_coding_signals(user_query)
    total_signals = chunk_signal_score + query_signal_score

    # Check via Groq classifier
    classifier_switch = await classify_routing(coach_type="learning", user_message=full_sample)

    # Hybrid decision:
    # 1. If classifier votes SWITCH, trust the LLM classification.
    # 2. If strong programming signals are found (>= 2 pattern matches in content/query), True even if classifier timed out.
    # 3. If query contains a coding keyword and total signals >= 1, True.
    if classifier_switch:
        return True
    if total_signals >= 2:
        return True
    if query_signal_score >= 1 and total_signals >= 1:
        return True

    return False


