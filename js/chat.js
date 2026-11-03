// Chat box: bad-word filter, quiet zones, NPC replies.
import { $, chatLine, say, sys, toast } from './ui.js';
import { addStat, G, has, pick } from './ctx.js';
import { LINES } from './session.js';
import { zoneAt } from './player.js';
import { npcs } from './stage.js';

const BAD_WORDS = ['đm', 'đmm', 'dmm', 'vcl', 'vl', 'đéo', 'địt', 'cặc', 'lồn', 'đĩ', 'cmm', 'clgt'];

export function cleanText(s) {
  return s.split(/(\s+)/).map((w) => (BAD_WORDS.includes(w.toLowerCase().replace(/[.,!?]/g, '')) ? '***' : w)).join('');
}
export function initChat() {
  $('chatForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const inp = $('chatInput');
    const text = cleanText(inp.value.trim());
    inp.value = '';
    inp.blur();
    if (!text || !G.state) return;
    const z = zoneAt(G.player.position);
    if (z?.quiet) {
      if (!has('ca-biet')) {
        toast(`🤫 ${z.name}: giữ trật tự! Không được nói chuyện.`);
        return;
      }
      if (G.state.phase === 'school' && G.sub === 'class' && Math.random() < 0.35) {
        addStat('conduct', -1);
        setTimeout(() => sys('Cô giáo nhắc nhở: “Học sinh cá biệt lại nói chuyện riêng!” (hạnh kiểm −1)'), 600);
      }
    }
    chatLine(G.state.name, text);
    say(G.meLabel, text);
    if (G.state.phase === 'home') {
      setTimeout(() => { const r = pick(['Ừ, con nhanh lên nhé.', 'Mẹ nghe rồi.', 'Con ngoan lắm.']); say(npcs.mom.label, r); chatLine('Mẹ', r); }, 900);
      return;
    }
    const n = npcs.nearest(G.player.position, 7);
    if (n) {
      const greet = /chào|hello|hi\b|xin chào/i.test(text);
      const r = greet ? `Chào ${G.state.name}!` : text.includes('?') ? pick(['Không biết nữa 😅', 'Hỏi cô đi!', 'Hình như là có đó']) : pick(LINES.reply);
      setTimeout(() => { say(n.label, r); chatLine(n.name, r); }, 900 + Math.random() * 800);
    }
  });
}
