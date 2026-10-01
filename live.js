const saved = localStorage.getItem("erodeCricketMatch");
if (!saved) location.href = "index.html";

const match = JSON.parse(saved);
let score = match.score || 0;
let wickets = match.wickets || 0;
let balls = match.balls || 0;
let innings = match.innings || 1;
let totalOvers = match.overs || 8;
let battingTeam = match.battingTeam;
let firstInningsScore = match.firstInningsScore;
let target = match.target;
let battingPlayers = battingTeam === 1 ? match.team1Players : match.team2Players;
let bowlingPlayers = battingTeam === 1 ? match.team2Players : match.team1Players;

let batsmen = [
    {name: battingPlayers[0], runs:0, balls:0, out:false},
    {name: battingPlayers[1], runs:0, balls:0, out:false}
];
let usedPlayers = new Set([battingPlayers[0], battingPlayers[1]]);
let striker = 0;
let nonStriker = 1;
let bowler = {name: bowlingPlayers[0], runs:0, balls:0, wickets:0};
let ballHistory = [];
let history = [];
let gameOver = false;

const $ = id => document.getElementById(id);

function saveSnapshot() {
    history.push(JSON.stringify({score,wickets,balls,innings,firstInningsScore,target,battingTeam,
        batsmen,used:[...usedPlayers],striker,nonStriker,bowler,ballHistory}));
    if(history.length > 20) history.shift();
}
function restoreSnapshot(s) {
    const x = JSON.parse(s);
    ({score,wickets,balls,innings,firstInningsScore,target,battingTeam,striker,nonStriker,bowler,ballHistory}=x);
    batsmen=x.batsmen; usedPlayers=new Set(x.used);
    battingPlayers=battingTeam===1?match.team1Players:match.team2Players;
    bowlingPlayers=battingTeam===1?match.team2Players:match.team1Players;
    update();
}
function oversText(b) { return `${Math.floor(b/6)}.${b%6}`; }
function ballsLabel() { return oversText(balls); }

function addCommentary(text) {
    const box=$("commentary");
    const empty=box.querySelector(".no-commentary");
    if(empty) empty.remove();
    const item=document.createElement("div");
    item.className="comment-item";
    item.innerHTML=`<strong>●</strong> ${text}`;
    box.prepend(item);
}

function addBall(v) {
    ballHistory.push(v);
    if(ballHistory.length>6) ballHistory.shift();
}

function swapStrike() {
    [striker,nonStriker]=[nonStriker,striker];
}

function addRun(runs) {
    if(gameOver || balls >= totalOvers*6) return;
    saveSnapshot();
    const p=batsmen[striker];
    score += runs; balls++; p.runs+=runs; p.balls++;
    bowler.runs+=runs; bowler.balls++;
    addBall(String(runs));
    addCommentary(`${ballsLabel()} - ${p.name} scored ${runs} run${runs>1?"s":""}.`);
    if(runs%2) swapStrike();
    afterLegalBall();
}
function dotBall() {
    if(gameOver || balls >= totalOvers*6) return;
    saveSnapshot();
    const p=batsmen[striker];
    balls++; p.balls++; bowler.balls++;
    addBall("•");
    addCommentary(`${ballsLabel()} - ${p.name} played a dot ball.`);
    afterLegalBall();
}
function wicket() {
    if(gameOver || balls >= totalOvers*6) return;
    saveSnapshot();
    const p=batsmen[striker];
    wickets++; balls++; p.balls++; p.out=true; bowler.balls++; bowler.wickets++;
    addBall("W");
    addCommentary(`${ballsLabel()} - WICKET! ${p.name} is OUT.`);
    update();
    if(wickets >= battingPlayers.length-1) { endOrNextInnings(); return; }
    showBatsmanModal();
}
function wide() {
    if(gameOver) return;
    saveSnapshot();
    score++; bowler.runs++;
    addBall("WD");
    addCommentary(`${ballsLabel()} - Wide ball. +1 run.`);
    update();
}
function noBall() {
    if(gameOver) return;
    saveSnapshot();
    score++; bowler.runs++;
    addBall("NB");
    addCommentary(`${ballsLabel()} - No ball. +1 run.`);
    update();
}
function afterLegalBall() {
    update();
    if(innings===2 && score>=target) return finishChase();
    if(balls>0 && balls%6===0) {
        swapStrike();
        update();
        if(balls < totalOvers*6 && wickets < battingPlayers.length-1) showBowlerModal();
        else endOrNextInnings();
    } else if(balls>=totalOvers*6) endOrNextInnings();
}
function endOrNextInnings() {
    if(gameOver) return;
    if(innings===1) startSecondInnings();
    else finishDefence();
}
function showBatsmanModal() {
    $("modalLabel").textContent="NEW BATSMAN";
    $("modalTitle").textContent="Select Next Batsman";
    const box=$("playerOptions"); box.innerHTML="";
    battingPlayers.forEach((name,i)=>{
        if(usedPlayers.has(name)) return;
        const btn=document.createElement("button");
        btn.className="player-option";
        btn.innerHTML=`<span class="player-number">${i+1}</span><span class="player-option-name">${name}</span>`;
        btn.onclick=()=>selectBatsman(name);
        box.appendChild(btn);
    });
    $("modal").classList.add("active");
}
function selectBatsman(name) {
    batsmen[striker]={name,runs:0,balls:0,out:false};
    usedPlayers.add(name);
    closeModal();
    update();
    if(balls%6===0) showBowlerModal();
}
function showBowlerModal() {
    $("modalLabel").textContent="NEW OVER";
    $("modalTitle").textContent="Select New Bowler";
    const box=$("playerOptions"); box.innerHTML="";
    bowlingPlayers.forEach((name,i)=>{
        const btn=document.createElement("button");
        btn.className="player-option";
        btn.innerHTML=`<span class="player-number">${i+1}</span><span class="player-option-name">${name}</span>`;
        btn.onclick=()=>selectBowler(name);
        box.appendChild(btn);
    });
    $("modal").classList.add("active");
}
function selectBowler(name) {
    bowler={name,runs:0,balls:0,wickets:0};
    closeModal(); update();
    addCommentary(`New over started. ${name} is bowling.`);
}
function closeModal() { $("modal").classList.remove("active"); }

function startSecondInnings() {
    firstInningsScore=score; target=score+1;
    innings=2;
    battingTeam=battingTeam===1?2:1;
    battingPlayers=battingTeam===1?match.team1Players:match.team2Players;
    bowlingPlayers=battingTeam===1?match.team2Players:match.team1Players;
    score=0; wickets=0; balls=0; ballHistory=[]; history=[];
    batsmen=[
        {name:battingPlayers[0],runs:0,balls:0,out:false},
        {name:battingPlayers[1],runs:0,balls:0,out:false}
    ];
    usedPlayers=new Set([battingPlayers[0],battingPlayers[1]]);
    striker=0; nonStriker=1;
    bowler={name:bowlingPlayers[0],runs:0,balls:0,wickets:0};
    addCommentary(`2nd innings started. Target: ${target}`);
    update();
}
function finishChase() {
    gameOver=true;
    showResult(
        battingTeam===1?match.team1:match.team2,
        `Reached the target of ${target} with ${target-score+score} runs scored.`
    );
}
function finishDefence() {
    gameOver=true;
    const winner=battingTeam===1?match.team2:match.team1;
    const margin=Math.max(firstInningsScore-score,0);
    showResult(winner, `Won by ${margin} run${margin===1?"":"s"}.`);
}
function showResult(title,text) {
    $("resultTitle").textContent=title;
    $("resultText").textContent=text;
    $("resultModal").classList.add("active");
}
function undoLastBall() {
    if(!history.length || gameOver) return alert("Nothing to undo.");
    restoreSnapshot(history.pop());
}

function update() {
    $("battingTeamName").textContent=battingTeam===1?match.team1:match.team2;
    $("bowlingTeamName").textContent=battingTeam===1?match.team2:match.team1;
    $("score").textContent=score;
    $("wickets").textContent=wickets;
    $("oversText").textContent=oversText(balls);
    $("totalOvers").textContent=totalOvers;
    $("inningsLabel").textContent=innings===1?"1ST INNINGS":"2ND INNINGS";

    const rr=balls?score/(balls/6):0;
    $("runRate").textContent=rr.toFixed(2);
    $("target").textContent=innings===2?target:"—";
    $("required").textContent=innings===2?Math.max(target-score,0):"—";

    renderBatsman("strikerRow",batsmen[striker],true);
    renderBatsman("nonStrikerRow",batsmen[nonStriker],false);

    $("bowlerName").textContent=bowler.name;
    $("bowlerOvers").textContent=oversText(bowler.balls);
    $("bowlerRuns").textContent=bowler.runs;
    $("bowlerWickets").textContent=bowler.wickets;
    $("bowlerStats").textContent=`${oversText(bowler.balls)} - ${bowler.runs} - ${bowler.wickets}`;

    const box=$("lastBalls"); box.innerHTML="";
    [...Array(6-ballHistory.length).fill("—"),...ballHistory].forEach(v=>{
        const d=document.createElement("div"); d.textContent=v;
        if(v==="W") d.classList.add("danger");
        if(v==="4"||v==="6") d.classList.add("blue");
        if(v==="WD"||v==="NB") d.classList.add("yellow");
        box.appendChild(d);
    });
    $("ballCount").textContent=`${balls} BALLS`;

    localStorage.setItem("erodeCricketMatch",JSON.stringify({
        ...match,score,wickets,balls,innings,firstInningsScore,target,battingTeam
    }));
}
function renderBatsman(id,p,isStriker) {
    $(id).innerHTML=`
        <div class="player-avatar">${isStriker?"★":"2"}</div>
        <div class="player-info"><strong>${p.name}</strong><span>${p.runs} (${p.balls})</span></div>
        ${isStriker?'<div class="striker">●</div>':""}`;
}

update();