async function fetchScore() {
    try {
        const res = await fetch("/api/score");
        const data = await res.json();

        document.getElementById("batsman1").innerText = data.batsman1;
        document.getElementById("batsman2").innerText = data.batsman2;
        document.getElementById("score").innerText = data.score;
        document.getElementById("bowler").innerText = data.bowler;

        const ballsContainer = document.getElementById("balls");
        ballsContainer.innerHTML = "";
        data.balls.forEach(type => {
            const ball = document.createElement("div");
            ball.classList.add("ball");
            if (type === "run") ball.classList.add("run");
            if (type === "wicket") ball.classList.add("wicket");
            ballsContainer.appendChild(ball);
        });
    } catch (err) {
        console.error("Error fetching score:", err);
    }
}

fetchScore();
setInterval(fetchScore, 3000);
