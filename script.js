const STORAGE_USERS = 'martingale_users_v2';
const STORAGE_SESSION = 'martingale_session_v2';

const authCard = document.getElementById('auth-card');
const appCard = document.getElementById('app-card');
const tabs = [...document.querySelectorAll('.tab')];
const authMessage = document.getElementById('auth-message');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const calcForm = document.getElementById('calc-form');
const logoutBtn = document.getElementById('logout-btn');
const welcome = document.getElementById('welcome');
const results = document.getElementById('results');
const progressionBody = document.getElementById('progression-body');

const output = {
  dailyGoal: document.getElementById('daily-goal'),
  profitPerCycle: document.getElementById('profit-per-cycle'),
  cyclesNeeded: document.getElementById('cycles-needed'),
  levelsSupported: document.getElementById('levels-supported'),
  requiredBankroll: document.getElementById('required-bankroll'),
  levelsStatus: document.getElementById('levels-status')
};

function readUsers() {
  return JSON.parse(localStorage.getItem(STORAGE_USERS) || '{}');
}

function writeUsers(users) {
  localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
}

function setMessage(text, ok = false) {
  authMessage.textContent = text;
  authMessage.style.color = ok ? '#34d399' : '#f87171';
}

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function showApp(username) {
  authCard.classList.add('hidden');
  appCard.classList.remove('hidden');
  welcome.textContent = `Usuário logado: ${username}`;

  const users = readUsers();
  const data = users[username]?.settings;
  if (data) {
    calcForm.bankroll.value = data.bankroll;
    calcForm.baseBet.value = data.baseBet;
    calcForm.goalPercent.value = data.goalPercent;
    calcForm.targetLevels.value = data.targetLevels;
  }
}

function showAuth() {
  appCard.classList.add('hidden');
  authCard.classList.remove('hidden');
  results.classList.add('hidden');
  loginForm.reset();
  registerForm.reset();
}

function saveSession(username) {
  localStorage.setItem(STORAGE_SESSION, username);
}

function clearSession() {
  localStorage.removeItem(STORAGE_SESSION);
}

function switchTab(target) {
  tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === target));
  loginForm.classList.toggle('active', target === 'login');
  registerForm.classList.toggle('active', target === 'register');
  setMessage('');
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

registerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const username = registerForm.username.value.trim();
  const password = registerForm.password.value;
  const users = readUsers();

  if (users[username]) {
    setMessage('Esse usuário já existe.');
    return;
  }

  users[username] = { password, settings: null };
  writeUsers(users);
  setMessage('Conta criada com sucesso! Faça login.', true);
  switchTab('login');
});

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const username = loginForm.username.value.trim();
  const password = loginForm.password.value;
  const users = readUsers();

  if (!users[username] || users[username].password !== password) {
    setMessage('Usuário ou senha inválidos.');
    return;
  }

  saveSession(username);
  showApp(username);
});

logoutBtn.addEventListener('click', () => {
  clearSession();
  showAuth();
});

function buildProgression(baseBet, desiredProfit, bankroll, maxRows = 50) {
  const rows = [];
  let cumulativeLoss = 0;

  for (let level = 1; level <= maxRows; level += 1) {
    const betPerColumn = round2(level === 1 ? baseBet : cumulativeLoss + desiredProfit);
    const totalRoundStake = round2(betPerColumn * 2);
    const profitIfWin = round2(betPerColumn - cumulativeLoss);
    const lossIfLoseUntilHere = round2(cumulativeLoss + totalRoundStake);

    rows.push({
      level,
      betPerColumn,
      totalRoundStake,
      lossIfLoseUntilHere,
      profitIfWin
    });

    cumulativeLoss = lossIfLoseUntilHere;
    if (cumulativeLoss > bankroll * 100) {
      break;
    }
  }

  return rows;
}

calcForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const bankroll = Number(calcForm.bankroll.value);
  const baseBet = Number(calcForm.baseBet.value);
  const goalPercent = Number(calcForm.goalPercent.value);
  const targetLevels = Number(calcForm.targetLevels.value);

  if (bankroll <= 0 || baseBet <= 0 || goalPercent <= 0 || targetLevels < 1) {
    alert('Preencha os valores corretamente.');
    return;
  }

  const desiredProfit = baseBet;
  const dailyGoal = round2(bankroll * (goalPercent / 100));
  const cyclesNeeded = Math.ceil(dailyGoal / desiredProfit);

  const progression = buildProgression(baseBet, desiredProfit, bankroll, 60);

  let levelsSupported = 0;
  progression.forEach((row) => {
    if (row.lossIfLoseUntilHere <= bankroll) {
      levelsSupported += 1;
    }
  });

  const requiredBankroll = progression[targetLevels - 1]
    ? progression[targetLevels - 1].lossIfLoseUntilHere
    : progression[progression.length - 1].lossIfLoseUntilHere;

  output.dailyGoal.textContent = formatBRL(dailyGoal);
  output.profitPerCycle.textContent = `${formatBRL(desiredProfit)} por ciclo ganho`;
  output.cyclesNeeded.textContent = `${cyclesNeeded} ciclos vencedores`;
  output.levelsSupported.textContent = `${levelsSupported} níveis`;
  output.requiredBankroll.textContent = formatBRL(requiredBankroll);
  output.levelsStatus.textContent = levelsSupported >= targetLevels
    ? `✅ Sua banca atinge ${targetLevels} níveis.`
    : `⚠️ Sua banca não atinge ${targetLevels} níveis. Reduza aposta base ou aumente banca.`;

  progressionBody.innerHTML = '';
  progression.slice(0, Math.max(targetLevels, levelsSupported, 10)).forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.level}</td>
      <td>${formatBRL(row.betPerColumn)}</td>
      <td>${formatBRL(row.totalRoundStake)}</td>
      <td>${formatBRL(row.lossIfLoseUntilHere)}</td>
      <td>${formatBRL(row.profitIfWin)}</td>
    `;
    progressionBody.appendChild(tr);
  });

  results.classList.remove('hidden');

  const username = localStorage.getItem(STORAGE_SESSION);
  const users = readUsers();
  if (username && users[username]) {
    users[username].settings = { bankroll, baseBet, goalPercent, targetLevels };
    writeUsers(users);
  }
});

(function bootstrap() {
  const username = localStorage.getItem(STORAGE_SESSION);
  const users = readUsers();
  if (username && users[username]) {
    showApp(username);
  } else {
    showAuth();
  }
})();
