import React, { createContext, useReducer, useContext, Dispatch } from 'react';
import { User } from '@supabase/supabase-js';
import { Bet, Platform, Sponsor, Ad, SpecialOdd } from '../types';
import { InitialData } from '../api/database';

type State = {
    currentUser: User | null;
    dataLoaded: boolean;
    activePage: string;
    isSidebarCollapsed: boolean;
    isMobileMenuOpen: boolean;
    dashboardPeriod: 'all' | 'week' | 'month';
    bets: Bet[];
    platforms: Platform[];
    sponsors: Sponsor[];
    ads: Ad[];
    specialOdds: SpecialOdd[];
    modal: {
        type: string | null;
        props: any;
    };
};

type Action =
    | { type: 'SET_CURRENT_USER'; payload: User | null }
    | { type: 'SET_INITIAL_DATA'; payload: InitialData }
    | { type: 'SET_ACTIVE_PAGE'; payload: string }
    | { type: 'TOGGLE_SIDEBAR' }
    | { type: 'SET_MOBILE_MENU'; payload: boolean }
    | { type: 'SET_DASHBOARD_PERIOD'; payload: 'all' | 'week' | 'month' }
    | { type: 'ADD_BET'; payload: Bet }
    | { type: 'UPDATE_BET'; payload: Bet }
    | { type: 'DELETE_BET'; payload: number }
    | { type: 'SET_BETS'; payload: Bet[] }
    | { type: 'ADD_PLATFORM'; payload: Platform }
    | { type: 'DELETE_PLATFORM'; payload: number }
    | { type: 'SET_PLATFORMS'; payload: Platform[] }
    | { type: 'ADD_SPECIAL_ODD'; payload: SpecialOdd }
    | { type: 'UPDATE_SPECIAL_ODD'; payload: SpecialOdd }
    | { type: 'SHOW_MODAL'; payload: { type: string; props?: any } }
    | { type: 'HIDE_MODAL' }
    | { type: 'SIGN_OUT' };


const initialState: State = {
    currentUser: null,
    dataLoaded: false,
    activePage: 'dashboard',
    isSidebarCollapsed: false,
    isMobileMenuOpen: false,
    dashboardPeriod: 'all',
    bets: [],
    platforms: [],
    sponsors: [],
    ads: [],
    specialOdds: [],
    modal: { type: null, props: {} },
};

const StateContext = createContext<{ state: State; dispatch: Dispatch<Action> } | undefined>(undefined);

const stateReducer = (state: State, action: Action): State => {
    switch (action.type) {
        case 'SET_CURRENT_USER':
            return { ...state, currentUser: action.payload };
        case 'SET_INITIAL_DATA':
            return {
                ...state,
                ...action.payload,
                dataLoaded: true,
            };
        case 'SIGN_OUT':
            return { ...initialState };
        case 'SET_ACTIVE_PAGE':
            return { ...state, activePage: action.payload, isMobileMenuOpen: false };
        case 'TOGGLE_SIDEBAR':
            return { ...state, isSidebarCollapsed: !state.isSidebarCollapsed };
        case 'SET_MOBILE_MENU':
            return { ...state, isMobileMenuOpen: action.payload };
        case 'SET_DASHBOARD_PERIOD':
            return { ...state, dashboardPeriod: action.payload };
        case 'ADD_BET':
            return { ...state, bets: [action.payload, ...state.bets] };
        case 'UPDATE_BET':
            return {
                ...state,
                bets: state.bets.map(b => b.id === action.payload.id ? action.payload : b),
            };
        case 'DELETE_BET':
            return { ...state, bets: state.bets.filter(b => b.id !== action.payload) };
        case 'SET_BETS':
            return { ...state, bets: action.payload };
        case 'ADD_PLATFORM':
            return { ...state, platforms: [...state.platforms, action.payload] };
        case 'DELETE_PLATFORM':
            return { ...state, platforms: state.platforms.filter(p => p.id !== action.payload) };
        case 'SET_PLATFORMS':
            return { ...state, platforms: action.payload };
        case 'ADD_SPECIAL_ODD':
            return { ...state, specialOdds: [action.payload, ...state.specialOdds] };
        case 'UPDATE_SPECIAL_ODD':
            return {
                ...state,
                specialOdds: state.specialOdds.map(o => o.id === action.payload.id ? action.payload : o),
            };
        case 'SHOW_MODAL':
            return { ...state, modal: { type: action.payload.type, props: action.payload.props || {} } };
        case 'HIDE_MODAL':
            return { ...state, modal: { type: null, props: {} } };
        default:
            return state;
    }
};

export const StateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(stateReducer, initialState);

    return (
        <StateContext.Provider value={{ state, dispatch }}>
            {children}
        </StateContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(StateContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within a StateProvider');
    }
    return context;
};
