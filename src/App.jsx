import { BrowserRouter, Routes, Route } from 'react-router-dom'
import CareerClarityQuiz from './components/CareerClarityQuiz'
import FlowFinderProblems from './components/FlowFinderProblems'
import FlowFinderPersona from './components/FlowFinderPersona'
import FlowFinderSkills from './components/FlowFinderSkills'
import FlowFinderIntegration from './components/FlowFinderIntegration'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CareerClarityQuiz />} />
        <Route path="/nikigai/problems" element={<FlowFinderProblems />} />
        <Route path="/nikigai/persona" element={<FlowFinderPersona />} />
        <Route path="/nikigai/skills" element={<FlowFinderSkills />} />
        <Route path="/nikigai/integration" element={<FlowFinderIntegration />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
