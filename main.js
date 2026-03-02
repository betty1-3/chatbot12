import './style.css'

const GEMINI_BACKEND_URL = "https://llmbackend12-1.onrender.com/api/ask-llm";
const ML_BACKEND_URL = "https://agri-ai-web-app.onrender.com/";

const translations = {
  english: {
    greeting: "Hello! What's the location of your farm? Please mention the district and state.",
    q2: "What's your farm size in acres?",
    q3: "What's your crop type?",
    q4: "When did you sow or are planning to sow the crop?",
    processing: "Processing inputs...",
    lang: 'en-US'
  },
  hindi: {
    greeting: "नमस्ते! आपके खेत का स्थान क्या है? कृपया जिला और राज्य बताएं।",
    q2: "आपके खेत का आकार एकड़ में क्या है?",
    q3: "आपकी फसल का प्रकार क्या है?",
    q4: "आपने फसल कब बोई या बोने की योजना बना रहे हैं?",
    processing: "इनपुट प्रोसेस हो रहे हैं...",
    lang: 'hi-IN'
  },
  odia: {
    greeting: "ନମସ୍କାର! ଆପଣଙ୍କ ଚାଷ ଜମିର ସ୍ଥାନ କଣ?",
    q2: "ଆପଣଙ୍କ ଚାଷ ଜମିର ଆକାର ଏକର ରେ କେତେ?",
    q3: "ଆପଣଙ୍କ ଫସଲର ପ୍ରକାର କଣ?",
    q4: "ଆପଣ କେବେ ଫସଲ ବୁଣିଛନ୍ତି?",
    processing: "ଇନପୁଟ୍ ପ୍ରକ୍ରିୟାକରଣ...",
    lang: 'en-US'
  },
  tamil: {
    greeting: "வணக்கம்! உங்கள் பண்ணையின் இடம் என்ன?",
    q2: "உங்கள் பண்ணை அளவு ஏக்கரில் என்ன?",
    q3: "உங்கள் பயிர் வகை என்ன?",
    q4: "நீங்கள் எப்போது பயிரை விதைத்தீர்கள்?",
    processing: "உள்ளீடுகளை செயலாக்குகிறது...",
    lang: 'ta-IN'
  }
};

let currentLanguage = null;
let questionIndex = 0;
let recognition = null;

const collectedData = {
  district: null,
  state: null,
  farm_size_acres: null,
  crop_type: null,
  sowing_date: null
};

const app = document.querySelector('#app');
app.innerHTML = `
  <div class="language-modal" id="languageModal">
    <div class="modal-content">
      <h2>Select Your Language</h2>
      <div class="language-buttons">
        <button class="language-btn" data-lang="english">English</button>
        <button class="language-btn" data-lang="hindi">हिन्दी</button>
        <button class="language-btn" data-lang="odia">ଓଡ଼ିଆ</button>
        <button class="language-btn" data-lang="tamil">தமிழ்</button>
      </div>
    </div>
  </div>

  <div class="chatbox">
    <div class="chat-header">Agricultural Data Collection</div>
    <div class="chat-messages" id="chatMessages"></div>
    <div class="chat-input-container">
      <input type="text" id="messageInput" placeholder="Type your answer..." disabled />
      <button class="mic-button" id="micButton" disabled>🎤</button>
    </div>
  </div>
`;

const languageButtons = document.querySelectorAll('.language-btn');
const languageModal = document.getElementById('languageModal');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const micButton = document.getElementById('micButton');

languageButtons.forEach(button => {
  button.addEventListener('click', () => selectLanguage(button.dataset.lang));
});

function selectLanguage(lang) {
  currentLanguage = translations[lang];
  languageModal.classList.add('hidden');
  messageInput.disabled = false;
  micButton.disabled = false;

  addBotMessage(currentLanguage.greeting);
  speakMessage(currentLanguage.greeting, currentLanguage.lang);
  setupSpeechRecognition();
}

function addBotMessage(text) {
  const div = document.createElement('div');
  div.className = 'message bot';
  div.innerHTML = `<div class="message-bubble">${text}</div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addUserMessage(text) {
  const div = document.createElement('div');
  div.className = 'message user';
  div.innerHTML = `<div class="message-bubble">${text}</div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function speakMessage(text, lang) {
  if ('speechSynthesis' in window) {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    speechSynthesis.speak(utter);
  }
}

function setupSpeechRecognition() {
  if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.lang = currentLanguage.lang;
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      handleUserResponse(transcript);
    };
  }
}

messageInput.addEventListener('keypress', e => {
  if (e.key === 'Enter' && messageInput.value.trim()) {
    handleUserResponse(messageInput.value.trim());
  }
});

micButton.addEventListener('click', () => {
  if (!recognition) return;
  recognition.start();
});

async function extractWithGemini(text, field) {
  const res = await fetch(GEMINI_BACKEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      speech_input: text,
      field
    })
  });

  return await res.json();
}

async function handleUserResponse(response) {
  addUserMessage(response);
  messageInput.value = '';

  const fields = ["location", "farm_size", "crop_type", "sowing_date"];
  const field = fields[questionIndex];

  try {
    const data = await extractWithGemini(response, field);

    if (field === "location") {
      if (!data.district || !data.state) return retry("Please mention both district and state clearly.");
      collectedData.district = data.district;
      collectedData.state = data.state;
    }

    if (field === "farm_size") {
      if (!data.farm_size_acres) return retry("Please say your farm size clearly.");
      collectedData.farm_size_acres = data.farm_size_acres;
    }

    if (field === "crop_type") {
      if (!data.crop_type) return retry("Please mention a valid crop name.");
      collectedData.crop_type = data.crop_type;
    }

    if (field === "sowing_date") {
      if (!data.sowing_date) return retry("Please say your sowing date again.");
      collectedData.sowing_date = data.sowing_date;
    }

    questionIndex++;

    if (questionIndex === 4) {
      return finishProcess();
    }

    const nextQuestions = [currentLanguage.q2, currentLanguage.q3, currentLanguage.q4];
    addBotMessage(nextQuestions[questionIndex - 1]);
    speakMessage(nextQuestions[questionIndex - 1], currentLanguage.lang);

  } catch (err) {
    console.error(err);
    retry("Error processing input. Please try again.");
  }
}

function retry(message) {
  addBotMessage(message);
  speakMessage(message, currentLanguage.lang);
}

async function finishProcess() {
  addBotMessage(currentLanguage.processing);
  messageInput.disabled = true;
  micButton.disabled = true;

  try {
    await fetch(ML_BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(collectedData)
    });

    const query = new URLSearchParams(collectedData).toString();
    window.location.href = `${ML_BACKEND_URL}?${query}`;

  } catch (err) {
    addBotMessage("❌ Failed to connect to ML model.");
  }
}
