/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { Music, Mic2, Wind, History, Sparkles, Copy, Edit3, Loader2, ChevronDown, Check } from 'lucide-react';

// Option Types
type Vocalist = 'Hombre' | 'Mujer' | 'Duo';
type Style = 
  | 'Balada' | 'Bachata' | 'Pop' | 'Reggaetón' | 'Rock Latino' | 'Hip Hop' | 'Trap' | 'Rock' | 'Salsa' | 'Cumbia' 
  | 'Vallenato' | 'Bolero' | 'Pop Latino' | 'Moderno' | 'Folk' | 'Country' | 'Dance' | 'Electronica' | 'Urbano' 
  | 'Orquestal' | 'Instrumental' | 'Andina' | 'Flamenco' | 'Árabe' | 'EDM' | 'Cinemático';

type Atmosphere = 
  | 'Romantica' | 'Melancólica' | 'Emocional' | 'Alegre' | 'Energética' | 'Oscura'
  | 'Nostálgica' | 'Triste' | 'Apasionada' | 'Tierna' | 'Positiva' | 'Optimista'
  | 'Intensa' | 'Tensa' | 'Agresiva' | 'Ambiental' | 'Espiritual' | 'Cristiana';

const VOCALIST_OPTIONS: Vocalist[] = ['Hombre', 'Mujer', 'Duo'];
const STYLE_OPTIONS: Style[] = [
  'Balada', 'Bachata', 'Pop', 'Reggaetón', 'Rock Latino', 'Hip Hop', 'Trap', 'Rock', 'Salsa', 'Cumbia', 
  'Vallenato', 'Bolero', 'Pop Latino', 'Moderno', 'Folk', 'Country', 'Dance', 'Electronica', 'Urbano', 
  'Orquestal', 'Instrumental', 'Andina', 'Flamenco', 'Árabe', 'EDM', 'Cinemático'
];
const ATMOSPHERE_OPTIONS: Atmosphere[] = [
  'Romantica', 'Melancólica', 'Emocional', 'Alegre', 'Energética', 'Oscura',
  'Nostálgica', 'Triste', 'Apasionada', 'Tierna', 'Positiva', 'Optimista',
  'Intensa', 'Tensa', 'Agresiva', 'Ambiental', 'Espiritual', 'Cristiana'
];

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default function App() {
  const [vocalist, setVocalist] = useState<Vocalist>('Mujer');
  const [styles, setStyles] = useState<Style[]>(['Balada']);
  const [atmospheres, setAtmospheres] = useState<Atmosphere[]>(['Romantica']);
  const [history, setHistory] = useState('');
  const [prompt, setPrompt] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Dropdown and Ordering states
  const [showStyles, setShowStyles] = useState(false);
  const [showAtmospheres, setShowAtmospheres] = useState(false);
  const [orderedStyles, setOrderedStyles] = useState<Style[]>(STYLE_OPTIONS);
  const [orderedAtmospheres, setOrderedAtmospheres] = useState<Atmosphere[]>(ATMOSPHERE_OPTIONS);

  const toggleStyle = (style: Style) => {
    // Selection logic (FIFO)
    setStyles(prev => {
      if (prev.includes(style)) {
        return prev.length > 1 ? prev.filter(s => s !== style) : prev;
      }
      if (prev.length >= 2) {
        return [prev[1], style];
      }
      return [...prev, style];
    });

    // Reordering logic: If selected from dropdown, move to top of fixed menu
    setOrderedStyles(prev => {
      const index = prev.indexOf(style);
      if (index >= 5) {
        const newOrder = [...prev];
        const [item] = newOrder.splice(index, 1);
        newOrder.unshift(item);
        return newOrder;
      }
      return prev;
    });
  };

  const toggleAtmosphere = (atmosphere: Atmosphere) => {
    // Selection logic (FIFO)
    setAtmospheres(prev => {
      if (prev.includes(atmosphere)) {
        return prev.length > 1 ? prev.filter(a => a !== atmosphere) : prev;
      }
      if (prev.length >= 2) {
        return [prev[1], atmosphere];
      }
      return [...prev, atmosphere];
    });

    // Reordering logic: If selected from dropdown, move to top of fixed menu
    setOrderedAtmospheres(prev => {
      const index = prev.indexOf(atmosphere);
      if (index >= 5) {
        const newOrder = [...prev];
        const [item] = newOrder.splice(index, 1);
        newOrder.unshift(item);
        return newOrder;
      }
      return prev;
    });
  };

  const generateSong = async () => {
    if (!history.trim()) {
      setError('Por favor, ingresa una historia para la canción.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('La clave API de Gemini no está configurada. Por favor, asegúrate de que GEMINI_API_KEY esté en el entorno.');
      }
      const model = 'gemini-3.1-pro-preview';
      
      const systemInstruction = `Eres un Ingeniero de Prompts Musicales y Compositor Lírico experto. 
Tu misión es transformar variables en una estructura de canción completa y un prompt técnico en inglés.

REGLAS ESTRICTAS:
1. El Prompt para Generación de Audio debe estar en INGLÉS y debe seguir este patrón:
   "[Vocalista] clear Latin voice with neutral accent, [Estilos] styles, [Atmósferas] atmospheres, 100 BPM, high production quality".
   Puedes añadir detalles técnicos adicionales si lo deseas después de esa frase base.

2. La Letra de la Canción debe estar en ESPAÑOL.
3. La letra debe seguir esta estructura exacta:
   [Intro Instrumental]
   [Verso 1]
   [Verso 2]
   [Coro]
   [Verso 3]
   [Verso 4]
   [Solo Instrumental]
   [Puente]
   [Coro Final]
   [Outro]
4. Regla de Oro de la Letra: Rima consonante o asonante obligatoria en formato AABB para CADA estrofa (Verso 1 rima con Verso 2, Verso 3 rima con Verso 4).
5. La letra debe narrar fielmente el relato base proporcionado.
6. Formato de respuesta deseado (JSON):
{
  "prompt": "Promt en inglés...",
  "lyrics": "Letra en español con estructura y rimas AABB..."
}`;

      const userPrompt = `
Vocalista: ${vocalist}
Estilo Musical: ${styles.join(', ')}
Atmósfera: ${atmospheres.join(', ')}
Historia: ${history}

Genera el prompt técnico (English) y la letra (Spanish) siguiendo las reglas de rima AABB y la estructura definida.`;

      const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json"
        }
      });

      const rawText = response.text || '';
      if (!rawText) {
        throw new Error('La respuesta de la IA está vacía.');
      }

      // Robust JSON cleaning
      const jsonStart = rawText.indexOf('{');
      const jsonEnd = rawText.lastIndexOf('}');
      
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('No se pudo encontrar un formato JSON válido en la respuesta.');
      }
      
      const cleanJson = rawText.substring(jsonStart, jsonEnd + 1);
      const result = JSON.parse(cleanJson);

      if (!result.prompt || !result.lyrics) {
        throw new Error('La respuesta no contiene los campos requeridos (prompt o lyrics).');
      }

      setPrompt(result.prompt);
      setLyrics(result.lyrics);
    } catch (err) {
      console.error('Generation Error:', err);
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error al generar la canción: ${message}. Por favor intenta de nuevo.`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-emerald-50 text-slate-900 font-sans antialiased p-4 md:p-6 lg:p-8 selection:bg-indigo-100 overflow-y-auto">
      {/* Bento Grid Container */}
      <div className="max-w-[1600px] mx-auto flex flex-col gap-4">
        
        {/* Header Card */}
        <header className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Crea tu Canción Personalizada
              </span>
            </div>
            <span className="hidden sm:inline-block text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-bold uppercase tracking-wider">
              Composer Pro v2.4
            </span>
          </div>
          <div className="text-sm font-bold text-indigo-600 flex items-center gap-2">
            <span>cancionpersonalizada.cl</span>
          </div>
        </header>

        {/* Selection Tip */}
        <div className="w-full flex justify-center -mb-2">
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-4 py-1 rounded-full border border-indigo-100 uppercase tracking-[0.2em]">
            Nota: elige hasta 2 estilos y 2 atmósferas
          </span>
        </div>

        {/* Input Section (Top Area) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Selections Group */}
          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Vocalist */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col shadow-sm">
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                <Mic2 className="w-3 h-3" /> Vocalista
              </label>
              <div className="flex flex-wrap gap-2">
                {VOCALIST_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setVocalist(opt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                      vocalist === opt
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-200'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-indigo-300'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Style Dropdown */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col relative focus-within:border-indigo-400/50 transition-colors shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center gap-2">
                  <Music className="w-3 h-3" /> Estilos
                </label>
                <span className="text-[9px] text-slate-300 font-bold">{styles.length}/2</span>
              </div>
              
              <div className="flex flex-col gap-3">
                {/* Main 5 Style Buttons (Dynamic) */}
                <div className="flex flex-wrap gap-2">
                  {orderedStyles.slice(0, 5).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => toggleStyle(opt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                        styles.includes(opt)
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-200'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-indigo-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                {/* More Styles Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowStyles(!showStyles);
                      setShowAtmospheres(false);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-700 flex items-center justify-between hover:border-indigo-400 transition-all"
                  >
                    <span className="truncate max-w-[80%]">
                      {styles.some(s => !orderedStyles.slice(0, 5).includes(s)) 
                        ? styles.filter(s => !orderedStyles.slice(0, 5).includes(s)).join(', ') 
                        : 'Más Estilos'}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showStyles ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {showStyles && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-[250px] overflow-y-auto custom-scrollbar p-2"
                      >
                        {[...orderedStyles.slice(5)].sort((a, b) => {
                          const aSel = styles.includes(a);
                          const bSel = styles.includes(b);
                          if (aSel && !bSel) return -1;
                          if (!aSel && bSel) return 1;
                          return 0;
                        }).map((opt) => (
                          <button
                            key={opt}
                            onClick={() => {
                              toggleStyle(opt);
                              setShowStyles(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors mb-1 ${
                              styles.includes(opt)
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {opt}
                            {styles.includes(opt) && <Check className="w-3 h-3" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Atmosphere Dropdown */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col relative focus-within:border-indigo-400/50 transition-colors shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center gap-2">
                  <Wind className="w-3 h-3" /> Atmósferas
                </label>
                <span className="text-[9px] text-slate-300 font-bold">{atmospheres.length}/2</span>
              </div>
              
              <div className="flex flex-col gap-3">
                {/* Main 5 Atmosphere Buttons (Dynamic) */}
                <div className="flex flex-wrap gap-2">
                  {orderedAtmospheres.slice(0, 5).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => toggleAtmosphere(opt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                        atmospheres.includes(opt)
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-200'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-indigo-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                {/* More Atmospheres Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowAtmospheres(!showAtmospheres);
                      setShowStyles(false);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-700 flex items-center justify-between hover:border-indigo-400 transition-all"
                  >
                    <span className="truncate max-w-[80%]">
                      {atmospheres.some(a => !orderedAtmospheres.slice(0, 5).includes(a)) 
                        ? atmospheres.filter(a => !orderedAtmospheres.slice(0, 5).includes(a)).join(', ') 
                        : 'Más Atmósferas'}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showAtmospheres ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {showAtmospheres && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-[250px] overflow-y-auto custom-scrollbar p-2"
                      >
                        {[...orderedAtmospheres.slice(5)].sort((a, b) => {
                          const aSel = atmospheres.includes(a);
                          const bSel = atmospheres.includes(b);
                          if (aSel && !bSel) return -1;
                          if (!aSel && bSel) return 1;
                          return 0;
                        }).map((opt) => (
                          <button
                            key={opt}
                            onClick={() => {
                              toggleAtmosphere(opt);
                              setShowAtmospheres(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors mb-1 ${
                              atmospheres.includes(opt)
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {opt}
                            {atmospheres.includes(opt) && <Check className="w-3 h-3" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          {/* History / Action Area */}
          <div className="md:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col shadow-sm">
            <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-3 flex items-center gap-2">
              <History className="w-3 h-3" /> Historia / Relato Base
            </label>
            <textarea
              value={history}
              onChange={(e) => setHistory(e.target.value)}
              placeholder="Escribe la historia de la canción..."
              className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 focus:outline-none focus:border-indigo-400 transition-colors resize-none placeholder:text-slate-300 min-h-[100px]"
            />
            <button
              onClick={generateSong}
              disabled={loading}
              className="mt-4 w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? 'GENERANDO...' : 'GENERAR'}
            </button>
            {error && (
              <p className="mt-2 text-[10px] text-red-500 font-bold uppercase tracking-widest text-center">{error}</p>
            )}
          </div>
        </div>

        {/* Output Section (Bottom Area) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Prompt Result */}
          <div className="md:col-span-12 bg-white border border-slate-200 border-l-4 border-l-indigo-600 rounded-2xl p-5 flex flex-col gap-2 shadow-sm">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-bold tracking-widest text-indigo-600">
                Prompt para Generación de Audio (En Inglés)
              </label>
              {prompt && (
                <button onClick={() => copyToClipboard(prompt)} className="p-1 px-2 text-[10px] font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1">
                  <Copy className="w-3 h-3" /> COPIAR PROMPT
                </button>
              )}
            </div>
            <div className="font-mono text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
              {prompt ? `> ${prompt}` : <span className="text-slate-300 italic">El prompt aparecerá aquí...</span>}
            </div>
          </div>

          {/* Lyrics Result */}
          <div className="md:col-span-12 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 min-h-[500px] shadow-sm">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-bold tracking-widest text-emerald-600">
                Letra de la Canción (Editable - Español)
              </label>
              {lyrics && (
                <button onClick={() => copyToClipboard(lyrics)} className="p-1 px-2 text-[10px] font-bold text-slate-400 hover:text-emerald-500 flex items-center gap-1">
                  <Copy className="w-3 h-3" /> COPIAR LETRA
                </button>
              )}
            </div>
            <div className="flex-1 bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
              <textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder="La letra aparecerá aquí..."
                spellCheck={false}
                className="w-full h-full p-8 text-slate-800 font-serif text-lg md:text-xl leading-relaxed outline-none resize-none bg-transparent placeholder:text-slate-300 placeholder:italic"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

}
