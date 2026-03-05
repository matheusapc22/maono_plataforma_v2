// SPDX-License-Identifier: MIT
// Copyright contributors to the kepler.gl project
// @ts-nocheck

import { combineReducers, createStore, applyMiddleware, compose } from "redux";
import { createLogger } from "redux-logger";
import thunk from "redux-thunk";

import { enhanceReduxMiddleware } from "@kepler.gl/reducers";
// 🚀 1. IMPORTAÇÃO DAS ACTIONS DO KEPLER PARA O ESPIÃO
import { ActionTypes } from '@kepler.gl/actions';

// eslint-disable-next-line no-unused-vars
import Window from "global/window";

import demoReducer from "./pages/Kepler/reducers/index";

/* ------------------------------------------------------------------
 * 🚀 2. O NOSSO REDUCER ESPIÃO (APP REDUCER)
 * ------------------------------------------------------------------ */
const initialAppState = {
  isPinModeActive: false,
  clickedCoordinate: null
};

export const appReducer = (state = initialAppState, action) => {
  switch (action.type) {
    // Liga/Desliga o modo de "Soltar Alfinete"
    case 'TOGGLE_PIN_MODE':
      return { ...state, isPinModeActive: action.payload, clickedCoordinate: null };
      
    // Intercepta o clique nativo do Kepler (Sem tocar no DOM!)
    case ActionTypes.MAP_CLICK:
    case ActionTypes.LAYER_CLICK:
      if (state.isPinModeActive) {
        // O Kepler envia a coordenada de forma segura no payload [lng, lat]
        const coords = action.payload || (action.info && action.info.coordinate);
        
        if (coords && Array.isArray(coords) && coords.length >= 2) {
          return { 
            ...state, 
            clickedCoordinate: { lng: coords[0], lat: coords[1] } 
          };
        }
      }
      return state;
      
    default:
      return state;
  }
};

/* ------------------------------------------------------------------
 * Reducers
 * ------------------------------------------------------------------ */
const reducers = combineReducers({
  demo: demoReducer,
  app: appReducer // 🚀 3. INJETAMOS O NOSSO APP REDUCER AQUI!
});

/* ------------------------------------------------------------------
 * Middlewares (Kepler-aware)
 * ------------------------------------------------------------------ */
export const middlewares = enhanceReduxMiddleware([
  thunk,
]);

/* ------------------------------------------------------------------
 * Logger (somente DEV)
 * ------------------------------------------------------------------ */
if (import.meta.env.DEV) {
  const logger = createLogger({
    collapsed: () => true,
  });
  middlewares.push(logger);
}

/* ------------------------------------------------------------------
 * Enhancers
 * ------------------------------------------------------------------ */
export const enhancers = [applyMiddleware(...middlewares)];

const initialState = {};

/* ------------------------------------------------------------------
 * Redux DevTools (SAFE ENABLE)
 * ------------------------------------------------------------------ */
let composeEnhancers = compose;

if (
  import.meta.env.DEV &&
  Window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
) {
  composeEnhancers = Window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
    actionsBlacklist: [
      "@@kepler.gl/MOUSE_MOVE",
      "@@kepler.gl/UPDATE_MAP",
      "@@kepler.gl/LAYER_HOVER",
    ],
  });
}

/* ------------------------------------------------------------------
 * Store
 * ------------------------------------------------------------------ */
export default createStore(
  reducers,
  initialState,
  composeEnhancers(...enhancers)
);