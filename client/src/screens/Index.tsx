import { useState } from "react";
import socket from "../socket";

export default function Index() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  function handleCreate() {
    if (!name.trim()) return;
    socket.emit("room:create", { name: name.trim() });
  }

  function handleJoin() {
    if (!name.trim() || code.length !== 4) return;
    socket.emit("room:join", { name: name.trim(), code: code.toUpperCase() });
  }

  const isNameEmpty = !name.trim();
  const isCodeInvalid = code.length !== 4;
  const isCodeEmpty = !code.trim();
  const isButtonDisabled = isNameEmpty || (!isCodeEmpty && isCodeInvalid);
  const buttonText = isCodeEmpty ? "Crear sala" : "Unirse a sala";
  const handleAction = isCodeEmpty ? handleCreate : handleJoin;

  return (
    <div>
      <div className="adm-warning-badge">
        ⚠️ ALERTA HUMOR NEGRO 18+
      </div>

      <div className="adm-logo-container">
        <h1 className="adm-logo-title">AMIGOS</h1>
        <div className="adm-logo-de">DE</div>
        <h1 className="adm-logo-title adm-logo-title--pink">MIERDA</h1>
      </div>

      <div className="adm-card adm-card--dark adm-card--rotate-left">
        <div className="adm-field">
          <label className="adm-label" htmlFor="name">Tu nombre</label>
          <input
            id="name"
            type="text"
            maxLength={20}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre aquí..."
            className="adm-input"
          />
        </div>

        <div className="adm-field" style={{ marginTop: '20px' }}>
          <label className="adm-label" htmlFor="code">Código de sala (opcional para unirse)</label>
          <input
            id="code"
            type="text"
            maxLength={4}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCD"
            className="adm-input"
            style={{ textAlign: 'center', letterSpacing: '4px' }}
          />
        </div>

        <button 
          onClick={handleAction} 
          disabled={isButtonDisabled}
          className={`adm-btn adm-btn--primary ${isButtonDisabled ? 'adm-btn--disabled' : ''}`}
          style={{ marginTop: '10px' }}
        >
          {buttonText}
        </button>
      </div>

      <div className="adm-rules-section">
        <h3 className="adm-rules-title">Cómo se juega</h3>
        
        <div className="adm-rule-step">
          <div className="adm-rule-number">1</div>
          <div className="adm-rule-text">
            <strong>Se lee la pregunta:</strong> En cada ronda aparecerá una pregunta incómoda en pantalla.
          </div>
        </div>

        <div className="adm-rule-step">
          <div className="adm-rule-number">2</div>
          <div className="adm-rule-text">
            <strong>Votá al culpable:</strong> Pensá bien quién del grupo merece el título y emití tu voto.
          </div>
        </div>

        <div className="adm-rule-step">
          <div className="adm-rule-number">3</div>
          <div className="adm-rule-text">
            <strong>Quedar en evidencia:</strong> Quien junte la mayor cantidad de votos se queda con la carta de la ronda.
          </div>
        </div>

        <div className="adm-rule-step">
          <div className="adm-rule-number">4</div>
          <div className="adm-rule-text">
            <strong>Victoria de mierda:</strong> El primer jugador en juntar 5 cartas es coronado como el peor amigo del grupo.
          </div>
        </div>
      </div>

      <div className="adm-index-footer">
        Hecho con mala leche.
      </div>
    </div>
  );
}
