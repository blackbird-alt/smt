import { useEffect, useRef, useState } from "react";
import Confetti from "./Confetti";
import Icon from "./Icon";

const XP_PER_LEVEL = 100;
const levelOf = (xp) => Math.floor(xp / XP_PER_LEVEL) + 1;
const progressPct = (xp) => ((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100;

// The bar is hidden by default and pops in (as a toast) whenever XP is gained,
// animating the fill. Crossing a level boundary also shows a celebratory popup
// and confetti.
export default function XpBar({ xp = 0 }) {
  const prevXp = useRef(xp);
  const timers = useRef([]);

  const [visible, setVisible] = useState(false);
  const [fillPct, setFillPct] = useState(progressPct(xp));
  const [instant, setInstant] = useState(false);
  const [gain, setGain] = useState(0);
  const [levelUp, setLevelUp] = useState(null);
  const [confettiId, setConfettiId] = useState(0);

  useEffect(() => {
    const before = prevXp.current;
    prevXp.current = xp;

    if (xp <= before) {
      setFillPct(progressPct(xp));
      return undefined;
    }

    timers.current.forEach(clearTimeout);
    timers.current = [];
    const schedule = (fn, ms) => timers.current.push(setTimeout(fn, ms));

    const leveled = levelOf(xp) > levelOf(before);
    setGain(xp - before);
    setVisible(true);
    setInstant(true);
    setFillPct(progressPct(before));

    if (leveled) {
      setLevelUp({ level: levelOf(xp) });
      setConfettiId(Date.now());
      schedule(() => {
        setInstant(false);
        setFillPct(100);
      }, 80);
      schedule(() => {
        setInstant(true);
        setFillPct(0);
      }, 900);
      schedule(() => {
        setInstant(false);
        setFillPct(progressPct(xp));
      }, 980);
      schedule(() => {
        setVisible(false);
        setLevelUp(null);
      }, 3600);
    } else {
      schedule(() => {
        setInstant(false);
        setFillPct(progressPct(xp));
      }, 80);
      schedule(() => setVisible(false), 2600);
    }

    return undefined;
  }, [xp]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const level = levelOf(xp);

  return (
    <>
      <div
        className={`xp-toast ${visible ? "xp-toast-show" : ""}`}
        role="status"
        aria-hidden={!visible}
      >
        <div className="xp-bar-head">
          <span className="xp-level">
            <span className="xp-level-badge">{level}</span>
            Level {level}
          </span>
          <span className="xp-amount xp-gain-amount">
            <Icon name="zap" size={14} />+{gain} XP
          </span>
        </div>
        <div className="xp-track">
          <div
            className={`xp-fill ${instant ? "xp-fill-instant" : ""}`}
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </div>

      {levelUp && (
        <div className="xp-levelup" role="status">
          <div className="xp-levelup-card">
            <span className="xp-levelup-icon">
              <Icon name="trophy" size={30} />
            </span>
            <strong>Level {levelUp.level}!</strong>
            <span className="xp-levelup-gain">+{gain} XP</span>
          </div>
        </div>
      )}

      {confettiId > 0 && <Confetti key={confettiId} />}
    </>
  );
}
