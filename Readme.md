# Zenith AI - Your Mental Well-being Companion

A Python-based AI chat application, featuring "Zoe," an AI companion designed to provide mental well-being support through natural, empathetic conversations and evidence-based techniques.

![Zenith AI - Mental Well-being Companion](https://github.com/user-attachments/assets/0399a66e-ee84-402d-9920-04f1d35de890)

## About The Project

Zenith AI provides a safe and private space for users to engage in meaningful conversations about their mental well-being. The core of the application is Zoe, an adaptive AI designed to understand and match the user's communication style, creating a more personal and comfortable experience. By leveraging evidence-based approaches, Zoe offers supportive dialogue to help users navigate their feelings and challenges.

## Key Features

- 🤖 **Adaptive AI Personality**: Zoe, the AI companion, adapts to your communication style for a more natural and supportive interaction.
- 🧠 **Evidence-Based Support**: Engages users with techniques and conversational strategies rooted in mental health research.
- 💬 **Natural Conversational Interface**: A smooth and intuitive chat experience that makes it easy to open up.
- 🔐 **Privacy-Focused**: Your conversations are private. The application is designed with user privacy as a top priority.

## Tech Stack

This project is built with a modern stack, separating the backend logic from the frontend interface.

- **Backend**: Python
- **Frontend**: Node.js/JavaScript (React/Vue/etc.)
- **AI Model**: Groq with Llama 3 70b
- **Vector Database**: Qdrant

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Python 3.8+
- Node.js and npm
- Git

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/ThisisOmar-here/Zenith-AI.git
    cd Zenith-AI
    ```

2.  **Set up the Backend:**
    - Create a `.env` file in the root directory from the example:
      ```
      cp .env.example .env
      ```
    - Add your API keys to the `.env` file:
      ```
      GROQ_API_KEY=your_groq_api_key_here
      QDRANT_API_KEY=your_qdrant_api_key_here
      ```
    - Install the required Python packages:
      ```sh
      pip install -r requirements.txt
      ```

3.  **Set up the Frontend:**
    - Navigate to the frontend directory:
      ```sh
      cd zenith-ai
      ```
    - Install the required npm packages:
      ```sh
      npm install
      ```

## Usage

To run the application, you will need to start both the backend server and the frontend development server in separate terminals.

1.  **Start the Python Backend:**
    - In the root directory of the project, run:
      ```sh
      python api.py
      ```

2.  **Start the Frontend Application:**
    - In the `zenith-ai` directory, run:
      ```sh
      npm run dev
      ```

Once both servers are running, you can access the application in your browser at the address provided by the frontend development server (usually `http://localhost:3000` or a similar URL).

## Project Structure

Here is a brief overview of the key files in the project:

-   `api.py`: The entry point for the backend server.
-   `Main.py`: Contains the core logic for message handling and AI interaction.
-   `prompts.py`: Defines the AI system prompts and few-shot examples that shape Zoe's personality.
-   `UserProfile.py`: Manages user profile information and adaptation.
-   `zenith-ai/`: The directory containing the frontend application code.
-   `requirements.txt`: A list of all Python dependencies.

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

I can also help you create a `LICENSE` file or a `CONTRIBUTING.md` file if you'd like. Just let me know!
