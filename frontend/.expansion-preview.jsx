import { createRoot } from 'react-dom/client';
import { BrowserRouter, useSearchParams } from 'react-router-dom';
import { DashboardPreferencesProvider } from './src/lib/dashboardPreferences';
import DashboardLayout from './src/components/Dashboard/DashboardLayout';
import ContactSection from './src/components/Dashboard/ContactSection';
import EcoQuizSection from './src/components/Dashboard/EcoQuizSection';
import './src/index.css';
import './src/theme.css';
import './src/components/Dashboard/Dashboard.css';
const user={id:'browser-preview',email:'pessoa@example.test',userMetadata:{full_name:'Pessoa Arboris'}};
export function Shell(){const [params]=useSearchParams();const section=params.get('section')==='quiz'?'quiz':'contact';return <DashboardLayout section={section} sessionUser={user} motionPaused={false}><div className="dashboard-content" key={section}>{section==='quiz'?<EcoQuizSection sessionUser={user}/>:<ContactSection sessionUser={user}/>}</div></DashboardLayout>}
createRoot(document.getElementById('root')).render(<DashboardPreferencesProvider><BrowserRouter><Shell/></BrowserRouter></DashboardPreferencesProvider>);
