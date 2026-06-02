import { createBrowserRouter } from 'react-router-dom'
import Layout from '../components/Layout'
import Home from '../pages/Home'
import DnsVisual from '../pages/DnsVisual'
import TcpVisual from '../pages/TcpVisual'
import ScenarioSim from '../pages/ScenarioSim'
import KnowledgeBase from '../pages/KnowledgeBase'
import KnowledgeGraph from '../pages/KnowledgeGraph'
import AiChat from '../pages/AiChat'
import PacketStructure from '../pages/PacketStructure'
import FaultSimulation from '../pages/FaultSimulation'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <Home />,
      },
      {
        path: '/dns',
        element: <DnsVisual />,
      },
      {
        path: '/tcp',
        element: <TcpVisual />,
      },
      {
        path: '/scenario',
        element: <ScenarioSim />,
      },
      {
        path: '/packet',
        element: <PacketStructure />,
      },
      {
        path: '/fault',
        element: <FaultSimulation />,
      },
      {
        path: '/knowledge',
        element: <KnowledgeBase />,
      },
      {
        path: '/graph',
        element: <KnowledgeGraph />,
      },
      {
        path: '/chat',
        element: <AiChat />,
      },
    ],
  },
])

export default router
