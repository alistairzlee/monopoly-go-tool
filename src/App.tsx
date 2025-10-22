import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

type TileIndex = number;

const diceProb = [0, 0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1].map(v => v / 36);

const boardTiles = [
  "GO","MEDITERRANEAN AVE","COMMUNITY CHEST","BALTIC AVE","INCOME TAX",
  "READING RAILROAD","ORIENTAL AVE","CHANCE","VERMONT AVE","CONNECTICUT AVE",
  "JUST VISITING / JAIL","ST. CHARLES PLACE","ELECTRIC COMPANY","STATES AVE","VIRGINIA AVE",
  "PENNSYLVANIA RAILROAD","ST. JAMES PLACE","COMMUNITY CHEST","TENNESSEE AVE","NEW YORK AVE",
  "FREE PARKING","KENTUCKY AVE","CHANCE","INDIANA AVE","ILLINOIS AVE",
  "B. & O. RAILROAD","ATLANTIC AVE","VENTNOR AVE","WATER WORKS","MARVIN GARDENS",
  "GO TO JAIL","PACIFIC AVE","NORTH CAROLINA AVE","COMMUNITY CHEST","PENNSYLVANIA AVE",
  "SHORT LINE","CHANCE","PARK PLACE","LUXURY TAX","BOARDWALK"
] as const;

function calcGoodChance(start: TileIndex, goodTiles: TileIndex[]): number {
  let p = 0;
  for (let roll = 2; roll <= 12; roll++) {
    const target = (start + roll) % 40;
    if (goodTiles.includes(target)) p += diceProb[roll];
  }
  return +(p * 100).toFixed(2);
}

function breakdownFrom(start: TileIndex, goodTiles: TileIndex[]) {
  const rows = [];
  for (let roll = 2; roll <= 12; roll++) {
    const target = (start + roll) % 40;
    if (goodTiles.includes(target)) {
      rows.push({
        roll,
        distance: roll,
        tileIndex: target,
        name: boardTiles[target],
        prob: diceProb[roll],
      });
    }
  }
  const total = rows.reduce((sum, r) => sum + r.prob, 0);
  return { rows, totalPct: +(total * 100).toFixed(2) };
}

// Tile group definitions
const CORNERS = [0, 10, 20, 30];
const TAXES_UTILS = [4, 12, 28, 38];
const CHANCE = [7, 22, 36];
const RAILROADS = [5, 15, 25, 35];
const COMMUNITY = [2, 17, 33];
const NON_PROPS = new Set([...CORNERS, ...TAXES_UTILS, ...CHANCE, ...RAILROADS, ...COMMUNITY]);
const PROPERTIES = Array.from({ length: 40 }, (_, i) => i).filter(i => !NON_PROPS.has(i));

export default function App() {
  const [goodTiles, setGoodTiles] = useState<TileIndex[]>([]);
  const [hovered, setHovered] = useState<TileIndex | null>(null);

  const toggleTile = (i: TileIndex) => {
    setGoodTiles(prev => (prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]));
  };

  const toggleGroup = (indices: TileIndex[]) => {
    setGoodTiles(prev => {
      const allOn = indices.every(i => prev.includes(i));
      if (allOn) return prev.filter(i => !indices.includes(i));
      const set = new Set(prev);
      indices.forEach(i => set.add(i));
      return Array.from(set);
    });
  };

  const chanceFromHover = useMemo(
    () => (hovered === null ? null : calcGoodChance(hovered, goodTiles)),
    [hovered, goodTiles]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setHovered(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="App">
      <h2>Monopoly Board Probability Tool</h2>
      <p className="hint">Hover a square once to set position (sticks). Click any square to toggle GOOD.</p>

      <div className="toggles">
        <button onClick={() => toggleGroup(CORNERS)}>4 Corners</button>
        <button onClick={() => toggleGroup(TAXES_UTILS)}>Taxes & Utilities</button>
        <button onClick={() => toggleGroup(CHANCE)}>Chance</button>
        <button onClick={() => toggleGroup(RAILROADS)}>Railroads</button>
        <button onClick={() => toggleGroup(COMMUNITY)}>Community Chest</button>
        <button onClick={() => toggleGroup(PROPERTIES)}>Properties</button>
      </div>

      <div className="board">
        {Array.from({ length: 121 }).map((_, idx) => {
          const row = Math.floor(idx / 11);
          const col = idx % 11;

          if (row > 0 && row < 10 && col > 0 && col < 10)
            return <div key={idx} className="empty" />;

          let tileIndex: TileIndex;
          if (row === 10) tileIndex = 10 - col;
          else if (col === 0) tileIndex = 10 + (10 - row);
          else if (row === 0) tileIndex = 20 + col;
          else tileIndex = 30 + row;

          const name = boardTiles[tileIndex];
          const active = goodTiles.includes(tileIndex);
          const isHovered = hovered === tileIndex;
          const ownChance = calcGoodChance(tileIndex, goodTiles);

          return (
            <div
              key={idx}
              className={`tile ${active ? "good" : ""} ${isHovered ? "hovered" : ""}`}
              onMouseEnter={() => setHovered(tileIndex)}
              onClick={() => toggleTile(tileIndex)}
              title={`${tileIndex + 1}. ${name}`}
            >
              <strong>{tileIndex + 1}</strong>
              <div className="name">{name}</div>
              <div className="chance">{ownChance}%</div>
            </div>
          );
        })}
      </div>

      {hovered !== null && (
        <DetailsPanel
          hovered={hovered}
          goodTiles={goodTiles}
          chanceFromHover={chanceFromHover ?? 0}
        />
      )}
    </div>
  );
}

function DetailsPanel({
  hovered,
  goodTiles,
  chanceFromHover,
}: {
  hovered: TileIndex;
  goodTiles: TileIndex[];
  chanceFromHover: number;
}) {
  const { rows, totalPct } = breakdownFrom(hovered, goodTiles);

  return (
    <div className="panel">
      <h3>Position: #{hovered + 1} — {boardTiles[hovered]}</h3>
      <p>Chance to hit a GOOD tile (rolls 2–12): <b>{chanceFromHover}%</b></p>

      {rows.length === 0 ? (
        <p className="muted">No good tiles in range (2–12).</p>
      ) : (
        <div className="tableWrap">
          <table className="details">
            <thead>
              <tr>
                <th>Roll</th><th>Distance</th><th>Tile #</th><th>GOOD tile</th><th>Probability</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={`${r.tileIndex}-${r.roll}`}>
                  <td>{r.roll}</td>
                  <td>{r.distance}</td>
                  <td>{r.tileIndex + 1}</td>
                  <td>{r.name}</td>
                  <td>{(r.prob * 100).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} style={{ textAlign: "right" }}><strong>Total</strong></td>
                <td><strong>{totalPct}%</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="legend">Green = GOOD. Use the toggle buttons to mark groups quickly. Click any tile to flip it.</p>
    </div>
  );
}
