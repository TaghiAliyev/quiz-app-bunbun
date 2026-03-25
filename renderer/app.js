//const XLSX = require('xlsx')
//const pdfjsLib = require('pdfjs-dist/build/pdf')

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

let quiz = []
let current = 0
let userAnswers = []
let pdfDoc = null

async function generateQuiz() {
  try {
    const excelFile = document.getElementById('excel').files[0]
    const pdfFile = document.getElementById('pdf').files[0]
    const num = parseInt(document.getElementById('num').value)

    if (!excelFile || !pdfFile) {
      alert("Please select both Excel and PDF files")
      return
    }

    console.log("Loading Excel and PDF files from location:", excelFile.path, pdfFile.path)

    // Load Excel
    const data = await excelFile.arrayBuffer()
    const workbook = XLSX.read(data)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const allQuestions = XLSX.utils.sheet_to_json(sheet)

    // Randomly pick questions
    quiz = allQuestions.sort(() => 0.5 - Math.random()).slice(0, num)
    userAnswers = new Array(quiz.length)
    current = 0

    // Load PDF
    const pdfData = await pdfFile.arrayBuffer()
    pdfDoc = await pdfjsLib.getDocument({ data: pdfData }).promise

    // Hide setup and show quiz UI
    document.getElementById('setup').style.display = 'none'
    document.getElementById('quiz').style.display = 'block'

    // Render first question
    renderQuestion()

  } catch (err) {
    console.error(err)
    alert("Error occurred — check console")
  }
}

async function renderQuestion() {
    const q = quiz[current]
    if (!q) return

    // Question text
    document.getElementById('questionText').innerText =
        `Q${current + 1} (ID: ${q.QuestionID}): ${q.Question}`

    // Render PDF page
    const pageNum = parseInt(q.QuestionID) + 6
    const page = await pdfDoc.getPage(pageNum)

    const viewport = page.getViewport({ scale: 1 })
    const canvas = document.getElementById('pdfCanvas')
    const ctx = canvas.getContext('2d')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: ctx, viewport }).promise

    // Render answer buttons
    const answersDiv = document.getElementById('answers')
    answersDiv.innerHTML = ""

    const options = [
        { key: "A", text: q.A },
        { key: "B", text: q.B }
    ]

    options.forEach(opt => {
        const btn = document.createElement("button")
        btn.innerText = `${opt.key}: ${opt.text}`
        if (userAnswers[current] === opt.key) {
            btn.style.backgroundColor = '#90ee90' // light green for selection
        } else {
            btn.style.backgroundColor = ''
        }

        btn.onclick = () => {
            userAnswers[current] = opt.key
            renderQuestion() // refresh highlight
        }
        answersDiv.appendChild(btn)
    })

    // Enable Submit only on last question
    const submitBtn = document.getElementById('submitBtn')
    if (current === quiz.length - 1) {
        submitBtn.disabled = false
    } else {
        submitBtn.disabled = true
    }

    // Enable/disable Next/Prev buttons
    document.getElementById('prevBtn').disabled = (current === 0)
    document.getElementById('nextBtn').disabled = (current === quiz.length - 1)
}

function next() {
  if (current < quiz.length - 1) {
    current++
    renderQuestion()
  }
}

function prev() {
  if (current > 0) {
    current--
    renderQuestion()
  }
}

function submitQuiz() {
    // Hide quiz
    document.getElementById('quiz').style.display = 'none';

    // Show results page
    const resultDiv = document.getElementById('result');
    resultDiv.style.display = 'block';

    // Calculate score
    let score = 0;
    quiz.forEach((q, i) => {
        if (userAnswers[i] === q.Correct) score++;
    });

    // Header
    resultDiv.innerHTML = `
        <h2>Quiz Completed!</h2>
        <h3>Your Score: ${score} / ${quiz.length}</h3>
        <h3>Question Breakdown:</h3>
    `;

    const list = document.createElement('ol');

    quiz.forEach((q, i) => {
        const correct = userAnswers[i] === q.Correct;

        // Wrap the whole question block in a container
        const li = document.createElement('li');

        const questionBlock = document.createElement('div');
        questionBlock.style.color = correct ? 'black' : 'red'; // red for wrong answers
        questionBlock.innerHTML = `
            <strong>Q${i + 1} (ID: ${q.QuestionID}): ${q.Question}</strong><br>
            Your answer: ${userAnswers[i] || 'Not answered'}<br>
            Correct answer: ${q.Correct}
        `;

        li.appendChild(questionBlock);
        list.appendChild(li);
    });

    resultDiv.appendChild(list);

    // Navigation buttons
    const btnContainer = document.createElement('div');
    btnContainer.style.marginTop = '20px';

    const restartBtn = document.createElement('button');
    restartBtn.innerText = 'Go to Start';
    restartBtn.onclick = () => {
        document.getElementById('result').style.display = 'none';
        document.getElementById('setup').style.display = 'block';
    };

    const newQuizBtn = document.createElement('button');
    newQuizBtn.innerText = 'Generate New Quiz';
    newQuizBtn.style.marginLeft = '10px';
    newQuizBtn.onclick = () => {
        document.getElementById('result').style.display = 'none';
        document.getElementById('setup').style.display = 'block';
    };

    btnContainer.appendChild(restartBtn);
    btnContainer.appendChild(newQuizBtn);
    resultDiv.appendChild(btnContainer);
}