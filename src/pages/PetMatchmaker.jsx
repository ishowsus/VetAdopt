import { useState } from "react";
import { useNavigate } from "react-router-dom";

const QUESTIONS = [
  {
    id: 1,
    text: "What is your living situation?",
    options: [
      { text: "Apartment / Small Space", score: { cat: 3, dog: 1, rabbit: 3 } },
      { text: "House with a yard", score: { cat: 2, dog: 3, rabbit: 2 } }
    ]
  },
  {
    id: 2,
    text: "How active is your lifestyle?",
    options: [
      { text: "Relaxed (Netflix & Chill)", score: { cat: 3, dog: 1, rabbit: 2 } },
      { text: "Active (Daily walks/runs)", score: { cat: 1, dog: 3, rabbit: 1 } }
    ]
  },
  {
    id: 3,
    text: "How many hours will the pet be alone?",
    options: [
      { text: "0-4 hours", score: { cat: 2, dog: 3, rabbit: 2 } },
      { text: "8+ hours", score: { cat: 3, dog: 1, rabbit: 1 } }
    ]
  }
];

function PetMatchmaker() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [scores, setScores] = useState({ dog: 0, cat: 0, rabbit: 0 });
  const [result, setResult] = useState(null);

  const handleAnswer = (score) => {
    const newScores = {
      dog: scores.dog + score.dog,
      cat: scores.cat + score.cat,
      rabbit: scores.rabbit + score.rabbit
    };
    setScores(newScores);

    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      calculateResult(newScores);
    }
  };

  const calculateResult = (finalScores) => {
    const winner = Object.keys(finalScores).reduce((a, b) => finalScores[a] > finalScores[b] ? a : b);
    setResult(winner);
  };

  return (
    <div className="quiz-page">
      <style>{`
        .quiz-page { min-height: 100vh; background: #f0f7f0; display: flex; align-items: center; justify-content: center; font-family: 'Inter', sans-serif; padding: 20px; }
        .quiz-card { background: white; max-width: 500px; width: 100%; padding: 40px; border-radius: 30px; box-shadow: 0 15px 35px rgba(0,0,0,0.1); text-align: center; }
        .progress-bar { height: 6px; background: #eee; border-radius: 3px; margin-bottom: 30px; overflow: hidden; }
        .progress-fill { height: 100%; background: #2e7d32; transition: 0.3s; }
        .option-btn { width: 100%; padding: 15px; margin-bottom: 12px; border: 2px solid #eee; border-radius: 15px; background: none; font-size: 1rem; cursor: pointer; transition: 0.3s; font-weight: 500; }
        .option-btn:hover { border-color: #2e7d32; background: #f1f8f1; color: #2e7d32; }
        .result-img { font-size: 5rem; margin-bottom: 20px; }
        .action-btn { background: #2e7d32; color: white; border: none; padding: 15px 30px; border-radius: 25px; font-weight: bold; cursor: pointer; margin-top: 20px; }
      `}</style>

      <div className="quiz-card">
        {!result ? (
          <>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${((currentStep + 1) / QUESTIONS.length) * 100}%` }}></div>
            </div>
            <h2 style={{ color: '#1b5e20' }}>{QUESTIONS[currentStep].text}</h2>
            <div style={{ marginTop: '30px' }}>
              {QUESTIONS[currentStep].options.map((opt, i) => (
                <button key={i} className="option-btn" onClick={() => handleAnswer(opt.score)}>
                  {opt.text}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="fade-in">
            <div className="result-img">
              {result === 'dog' ? '🐶' : result === 'cat' ? '🐱' : '🐰'}
            </div>
            <h2 style={{ color: '#2e7d32' }}>It's a Match!</h2>
            <p>Based on your lifestyle, a <b>{result.toUpperCase()}</b> would be your perfect companion in Cebu.</p>
            <button className="action-btn" onClick={() => navigate("/adopt")}>
              View Available {result}s
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PetMatchmaker;