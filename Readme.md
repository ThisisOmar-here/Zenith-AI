# Zoe - Mental Well-being AI Companion

## A Python-based AI chat application that provides mental well-being support through natural conversations and evidence-based techniques.

![Zenith AI - Mental Well-being Companion](https://github.com/user-attachments/assets/0399a66e-ee84-402d-9920-04f1d35de890)

## Features

- 🤖 Adaptive AI personality that matches user's communication style
- 🧠 Mental health support using evidence-based approaches
- 💬 Natural conversational interface
- 🔐 Privacy-focused design

## Setup

1. Clone the repository
2. Create a `.env` file based on `.env.example`:
```
GROQ_API_KEY=your_groq_api_key_here
QDRANT_API_KEY=your_qdrant_api_key_here
```

3. Install dependencies:
```python
pip install -r requirements.txt
```

4. Run the application:
```bash
python api.py
```

Then, in a separate terminal, navigate to the frontend directory and start the development server:

```powershell
cd zenith-ai
npm run dev
```

## LLM
Uses **Open AI GPT OSS 120b**

## Project Structure

- `prompts.py` - AI system prompts and examples
- `Main.py` - Core logic and message handling
- `UserProfile.py` - User profile management

## Requirements

- Python 3.8+
- Required packages listed in `requirements.txt`
