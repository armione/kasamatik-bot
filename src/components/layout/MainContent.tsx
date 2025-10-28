import React from 'react';
import { useAppContext } from '../../context/StateContext';
import Dashboard from '../Dashboard';
// Placeholders for other components to be created
// import History from '../History'; 
// import SpecialOdds from '../SpecialOdds';
// import Statistics from '../Statistics';
// import Settings from '../Settings';
// import AdminPanel from '../admin/AdminPanel';
import ModalRenderer from '../modals/ModalRenderer';
import Button from '../common/Button';


const MainContent: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const { activePage, isSidebarCollapsed } = state;

    const renderPage = () => {
        switch (activePage) {
            case 'dashboard':
                return <Dashboard />;
            // Other pages will be added here
            // case 'history':
            //     return <History />;
            // case 'special-odds':
            //     return <SpecialOdds />;
            // case 'statistics':
            //     return <Statistics />;
            // case 'settings':
            //     return <Settings />;
            // case 'admin':
            //     return <AdminPanel />;
            default:
                return <div>{activePage} Sayfası</div>;
        }
    };

    return (
        <main className={`main-content ${isSidebarCollapsed ? 'expanded' : ''}`}>
            {renderPage()}
             <button
                className="floating-action"
                onClick={() => dispatch({ type: 'SHOW_MODAL', payload: { type: 'ADD_BET' } })}
            >
                +
            </button>
            <ModalRenderer />
        </main>
    );
};

export default MainContent;
