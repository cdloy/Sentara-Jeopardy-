const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// ─── Game Content ────────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    name: "Speech Therapy Basics",
    questions: [
      {
        value: 200,
        clue: "This national credential — awarded after completing a master's degree and clinical fellowship — allows SLPs to practice independently.",
        answer: "What is the CCC-SLP (Certificate of Clinical Competence in Speech-Language Pathology)?"
      },
      {
        value: 400,
        clue: "Along with language and voice, these two additional areas round out the four core domains SLPs assess and treat.",
        answer: "What are articulation and fluency?"
      },
      {
        value: 600,
        clue: "This federal law mandates that eligible children with disabilities receive SLP services in public schools at no cost.",
        answer: "What is IDEA (Individuals with Disabilities Education Act)?"
      },
      {
        value: 800,
        clue: "This three-part clinical decision-making model blends the best available research, the clinician's expertise, and the patient's own values and preferences.",
        answer: "What is Evidence-Based Practice (EBP)?"
      },
      {
        value: 1000,
        clue: "This specialized practice area focuses on assessing and rehabilitating the voices of professional performers — singers, actors, and broadcasters.",
        answer: "What is Performing Arts Voice (Professional Voice Rehabilitation)?"
      }
    ]
  },
  {
    name: "Communication Disorders",
    questions: [
      {
        value: 200,
        clue: "A fluency disorder marked by involuntary repetitions, prolongations, and blocks in the flow of speech.",
        answer: "What is stuttering?"
      },
      {
        value: 400,
        clue: "Most commonly caused by stroke, this acquired language disorder affects the ability to speak, understand, read, or write.",
        answer: "What is aphasia?"
      },
      {
        value: 600,
        clue: "This motor speech disorder results from neurological damage that causes weakness or paralysis of the muscles used for speech.",
        answer: "What is dysarthria?"
      },
      {
        value: 800,
        clue: "This childhood disorder involves a persistent difficulty planning and sequencing the precise movements needed for speech — despite normal muscle strength.",
        answer: "What is Childhood Apraxia of Speech (CAS)?"
      },
      {
        value: 1000,
        clue: "This progressive neurological disease — for which LSVT LOUD therapy was specifically developed — causes a characteristic reduction in vocal loudness called hypophonia.",
        answer: "What is Parkinson's Disease?"
      }
    ]
  },
  {
    name: "Dysphagia & Swallowing",
    questions: [
      {
        value: 200,
        clue: "The medical term for difficulty swallowing.",
        answer: "What is dysphagia?"
      },
      {
        value: 400,
        clue: "This occurs when food, liquid, or secretions enter the airway below the true vocal folds — a leading cause of aspiration pneumonia.",
        answer: "What is aspiration?"
      },
      {
        value: 600,
        clue: "This instrumental study uses fluoroscopy with barium contrast to evaluate the oral, pharyngeal, and esophageal phases of swallowing in real time.",
        answer: "What is the Modified Barium Swallow Study (MBSS)?"
      },
      {
        value: 800,
        clue: "Adopted globally in 2019, this framework standardized the language for food texture and liquid thickness levels across all healthcare settings.",
        answer: "What is IDDSI (International Dysphagia Diet Standardisation Initiative)?"
      },
      {
        value: 1000,
        clue: "This dangerous form of aspiration shows no outward signs — no cough, no voice change — making it detectable only through instrumental assessment.",
        answer: "What is silent aspiration?"
      }
    ]
  },
  {
    name: "AAC & Technology",
    questions: [
      {
        value: 200,
        clue: "This abbreviation refers to systems and strategies that supplement or replace verbal speech for individuals with severe communication impairments.",
        answer: "What is AAC (Augmentative and Alternative Communication)?"
      },
      {
        value: 400,
        clue: "This type of AAC requires no external device — examples include gestures, facial expressions, eye gaze, and sign language.",
        answer: "What is unaided AAC?"
      },
      {
        value: 600,
        clue: "One of the most widely used symbol-based AAC apps for iPad, it generates speech from a grid-based vocabulary system.",
        answer: "What is Proloquo2Go?"
      },
      {
        value: 800,
        clue: "This foundational AAC principle holds that all individuals — regardless of disability severity — are capable of communication and deserve the chance to try.",
        answer: "What is the Presumption of Competence?"
      },
      {
        value: 1000,
        clue: "Developed by Beukelman and Mirenda, this AAC assessment framework identifies participation patterns and barriers across five levels: policy, practice, attitude, knowledge, and skill.",
        answer: "What is the Participation Model?"
      }
    ]
  },
  {
    name: "Better Hearing & Speech Month",
    questions: [
      {
        value: 200,
        clue: "Better Hearing and Speech Month is observed every year during this month.",
        answer: "What is May?"
      },
      {
        value: 400,
        clue: "The full name of ASHA — the professional association and credentialing body for SLPs and audiologists in the United States.",
        answer: "What is the American Speech-Language-Hearing Association?"
      },
      {
        value: 600,
        clue: "This Oscar-winning 2010 film — starring Colin Firth — brought widespread public attention to the work of speech-language pathologists.",
        answer: "What is The King's Speech?"
      },
      {
        value: 800,
        clue: "ASHA was founded in this year, formally establishing speech-language pathology as a recognized profession.",
        answer: "What is 1925?"
      },
      {
        value: 1000,
        clue: "With over 220,000 members, ASHA's BHSM campaigns remind the public that early identification and treatment of communication disorders can transform this aspect of a person's life.",
        answer: "What is quality of life (or: the ability to communicate / connect with others)?"
      }
    ]
  }
];

// ─── Game State ───────────────────────────────────────────────────────────────
let gameState = {
  scores: { team1: 0, team2: 0 },
  teamNames: { team1: 'Team 1', team2: 'Team 2' },
  usedQuestions: [],
  currentQuestion: null,
  buzzedTeam: null,
  buzzerOpen: false,
  phase: 'board'
};

function resetQuestion() {
  gameState.currentQuestion = null;
  gameState.buzzedTeam = null;
  gameState.buzzerOpen = false;
  gameState.phase = 'board';
}

// ─── Socket Handlers ──────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.emit('fullState', {
    categories: CATEGORIES,
    gameState: { ...gameState }
  });

  socket.on('openQuestion', ({ categoryIdx, questionIdx }) => {
    const questionId = `${categoryIdx}-${questionIdx}`;
    if (gameState.usedQuestions.includes(questionId)) return;

    gameState.currentQuestion = { categoryIdx, questionIdx, questionId };
    gameState.buzzedTeam = null;
    gameState.buzzerOpen = true;
    gameState.phase = 'question';

    io.emit('questionOpened', {
      categoryName: CATEGORIES[categoryIdx].name,
      question: CATEGORIES[categoryIdx].questions[questionIdx],
      categoryIdx,
      questionIdx
    });
  });

  socket.on('buzz', ({ team }) => {
    if (gameState.buzzerOpen && !gameState.buzzedTeam && gameState.phase === 'question') {
      gameState.buzzedTeam = team;
      gameState.buzzerOpen = false;
      io.emit('buzzed', {
        team,
        teamName: gameState.teamNames[team]
      });
    }
  });

  socket.on('enableBuzzer', () => {
    gameState.buzzerOpen = true;
    gameState.buzzedTeam = null;
    io.emit('buzzerEnabled');
  });

  socket.on('markCorrect', () => {
    if (!gameState.currentQuestion || !gameState.buzzedTeam) return;
    const { categoryIdx, questionIdx, questionId } = gameState.currentQuestion;
    const value = CATEGORIES[categoryIdx].questions[questionIdx].value;
    gameState.scores[gameState.buzzedTeam] += value;
    if (!gameState.usedQuestions.includes(questionId)) {
      gameState.usedQuestions.push(questionId);
    }
    const closedId = questionId;
    resetQuestion();
    io.emit('scoreUpdate', gameState.scores);
    io.emit('questionClosed', { usedId: closedId });
  });

  socket.on('markWrong', () => {
    if (!gameState.currentQuestion || !gameState.buzzedTeam) return;
    const { categoryIdx, questionIdx } = gameState.currentQuestion;
    const value = CATEGORIES[categoryIdx].questions[questionIdx].value;
    gameState.scores[gameState.buzzedTeam] = Math.max(0, gameState.scores[gameState.buzzedTeam] - value);
    gameState.buzzedTeam = null;
    gameState.buzzerOpen = true;
    io.emit('scoreUpdate', gameState.scores);
    io.emit('buzzerEnabled');
  });

  socket.on('closeQuestion', () => {
    if (!gameState.currentQuestion) return;
    const closedId = gameState.currentQuestion.questionId;
    if (!gameState.usedQuestions.includes(closedId)) {
      gameState.usedQuestions.push(closedId);
    }
    resetQuestion();
    io.emit('questionClosed', { usedId: closedId });
  });

  socket.on('adjustScore', ({ team, amount }) => {
    gameState.scores[team] = Math.max(0, gameState.scores[team] + amount);
    io.emit('scoreUpdate', gameState.scores);
  });

  socket.on('setTeamName', ({ team, name }) => {
    if (name && name.trim()) {
      gameState.teamNames[team] = name.trim();
      io.emit('teamNamesUpdate', gameState.teamNames);
    }
  });

  socket.on('resetGame', () => {
    const names = gameState.teamNames;
    gameState = {
      scores: { team1: 0, team2: 0 },
      teamNames: names,
      usedQuestions: [],
      currentQuestion: null,
      buzzedTeam: null,
      buzzerOpen: false,
      phase: 'board'
    };
    io.emit('fullState', { categories: CATEGORIES, gameState: { ...gameState } });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces();
  let localIP = 'YOUR-IP';
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        localIP = net.address;
        break;
      }
    }
  }

  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║     Sentara Speech Therapy Jeopardy — READY TO PLAY   ║');
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║  Host/Game Board:  http://localhost:${PORT}/             ║`);
  console.log(`║  Team 1 Buzzer:    http://${localIP}:${PORT}/buzzer?team=1  ║`);
  console.log(`║  Team 2 Buzzer:    http://${localIP}:${PORT}/buzzer?team=2  ║`);
  console.log('╚═══════════════════════════════════════════════════════╝\n');
});
