import './style.css'
import { extractLocationData, extractFarmSize, extractCropType, extractSowingDate } from './dataExtractor.js'

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
    greeting: "ନମସ୍କାର! ଆପଣଙ୍କ ଚାଷ ଜମିର ସ୍ଥାନ କଣ? ଦୟାକରି ଜିଲ୍ଲା ଏବଂ ରାଜ୍ୟ ଉଲ୍ଲେଖ କରନ୍ତୁ।",
    q2: "ଆପଣଙ୍କ ଚାଷ ଜମିର ଆକାର ଏକର ରେ କେତେ?",
    q3: "ଆପଣଙ୍କ ଫସଲର ପ୍ରକାର କଣ?",
    q4: "ଆପଣ କେବେ ଫସଲ ବୁଣିଛନ୍ତି କିମ୍ବା ବୁଣିବାକୁ ଯୋଜନା କରୁଛନ୍ତି?",
    processing: "ଇନପୁଟ୍ ପ୍ରକ୍ରିୟାକରଣ...",
    lang: 'en-US'
  },
  tamil: {
    greeting: "வணக்கம்! உங்கள் பண்ணையின் இடம் என்ன? மாவட்டம் மற்றும் மாநிலத்தைக் குறிப்பிடவும்.",
    q2: "உங்கள் பண்ணை அளவு ஏக்கரில் என்ன?",
    q3: "உங்கள் பயிர் வகை என்ன?",
    q4: "நீங்கள் எப்போது பயிரை விதைத்தீர்கள் அல்லது விதைக்க திட்டமிடுகிறீர்கள்?",
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
      <p>भाषा चुनें | ଭାଷା ଚୟନ କରନ୍ତୁ | மொழியைத் தேர்ந்தெடுக்கவும்</p>
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
      <div class="input-wrapper">
        <input type="text" id="messageInput" placeholder="Type your answer..." disabled />
      </div>
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
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = currentLanguage.lang;

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      messageInput.value = transcript;
      handleUserResponse(transcript);
      micButton.classList.remove('recording');
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
  if (micButton.classList.contains('recording')) {
    recognition.stop();
    micButton.classList.remove('recording');
  } else {
    recognition.start();
    micButton.classList.add('recording');
  }
});

async function handleUserResponse(response) {
  addUserMessage(response);
  messageInput.value = '';

  let valid = true;

  switch (questionIndex) {
    case 0:
      const loc = extractLocationData(response);
      if (!loc.district || !loc.state) {
        addBotMessage("Please mention both district and state clearly.");
        speakMessage("Please say your district and state again.", currentLanguage.lang);
        valid = false;
      } else {
        collectedData.district = loc.district;
        collectedData.state = loc.state;
      }
      break;

    case 1:
      const size = extractFarmSize(response);
      if (!size || isNaN(size) || size <= 0) {
        addBotMessage("That doesn't seem valid. Please enter your farm size again.");
        speakMessage("Please say your farm size again.", currentLanguage.lang);
        valid = false;
      } else collectedData.farm_size_acres = size;
      break;

    case 2:
      const crop = extractCropType(response);
      if (!crop) {
        addBotMessage("Please mention a valid crop name.");
        speakMessage("Please say your crop name again.", currentLanguage.lang);
        valid = false;
      } else collectedData.crop_type = crop;
      break;

    case 3:
      const date = extractSowingDate(response);
      if (!date) {
        addBotMessage("Could not catch your sowing date. Please repeat.");
        speakMessage("Please say your sowing date again.", currentLanguage.lang);
        valid = false;
      } else collectedData.sowing_date = date;
      break;
  }

  if (!valid) return;

  questionIndex++;

  setTimeout(async () => {
    let next = '';

    switch (questionIndex) {
      case 1:
        next = currentLanguage.q2;
        break;
      case 2:
        next = currentLanguage.q3;
        break;
      case 3:
        next = currentLanguage.q4;
        break;
      case 4:
        next = currentLanguage.processing;
        addBotMessage(next);
        messageInput.disabled = true;
        micButton.disabled = true;

        console.log('Final collected data:', collectedData);

        try {
          // ✅ Send data to ML model backend
          await fetch('https://agri-ai-web-app.onrender.com/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(collectedData)
          });

          // ✅ Redirect with pre-filled parameters
          const query = new URLSearchParams(collectedData).toString();
          const redirectUrl = `https://agri-ai-web-app.onrender.com/?${query}`;

          addBotMessage("Redirecting to the ML model insights page...");
          speakMessage("Redirecting you to the insights page.", currentLanguage.lang);

          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 2000);

        } catch (err) {
          console.error('ML request failed:', err);
          addBotMessage("❌ Failed to connect to the ML model.");
        }
        return;
    }

    addBotMessage(next);
    speakMessage(next, currentLanguage.lang);
  }, 500);
}

if ('speechSynthesis' in window) {
  speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    speechSynthesis.getVoices();
  };
}
