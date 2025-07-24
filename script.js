const FPS = 60;
      const FRICTION = 0.7;
      const GAME_LIVES = 3;
      const LASER_DIST_FACTOR = 1.2;
      const LASER_EXPLOSION_DURATION = 0.1;
      const MAX_LASERS = 10;
      const LASER_SPEED = 500;
      const ASTEROID_JAGGEDNESS = 0.4;
      const POINTS_LARGE_ASTEROID = 20;
      const POINTS_MEDIUM_ASTEROID = 50;
      const POINTS_SMALL_ASTEROID = 100;
      const STARTING_ASTEROID_COUNT = 3;
      const TITLE_SCREEN_ASTEROID_COUNT = 10;
      const ASTEROID_INITIAL_SIZE = 120;
      const ASTEROID_SMALLEST_SIZE = 20;
      const ASTEROID_BASE_SPEED = 50;
      const ASTEROID_VERTICES = 10;
      const HIGH_SCORE_KEY = "highscore";
      const PLAYER_BLINK_DURATION = 0.1;
      const PLAYER_EXPLOSION_DURATION = 0.3;
      const PLAYER_INVINCIBILITY_DURATION = 3;
      const PLAYER_SHIP_SIZE = 30;
      const PLAYER_SHIP_THRUST = 5;
      const PLAYER_TURN_SPEED = 200;
      const SHOW_COLLISION_BOUNDING = false;
      const SHOW_SHIP_CENTER_DOT = false;
      const MUSIC_ENABLED = true;
      const SOUND_ENABLED = true;
      const TEXT_FADE_TIME = 2.5;
      const TEXT_FONT_SIZE = 40;
      const LASER_RELOAD_COOLDOWN = 0.25;
      const BLACK_HOLE_SIZE = 40;
      const BLACK_HOLE_ATTRACTION_FORCE = 25.00;
      const BOSS_HP = 100;
      const BOSS_SIZE = 200;
      const BOSS_LEVEL = 10;
      const BOSS_SPEED = 200;

      let blackHole = { x: 0, y: 0 };
      let canvas = document.getElementById("gameCanvas");
      let ctx = canvas.getContext("2d");

      const asteroidImages = Array.from({ length: 10 }, (_, i) => {
        const img = new Image();
        img.src = `/images/asteroid${i + 1}.png`;
        return img;
      });

      const backgroundImage = new Image();
      backgroundImage.src = "/images/background.png";

      const rocketImage = new Image();
      rocketImage.src = "/images/rocket.png";

      const bossImage = new Image();
      bossImage.src = "/images/boss.png";

      const fxExplosion = new Sound("sounds/explode.m4a");
      const fxHit = new Sound("sounds/hit.m4a", 5);
      const fxLaser = new Sound("sounds/laser.m4a", 5, 0.5);
      const fxThrust = new Sound("sounds/thrust.m4a");

      const gameMusic = new Music("sounds/music-low.m4a", "sounds/music-high.m4a");

      let asteroidsLeft, totalAsteroids;
      let currentLevel, playerLives, asteroids, score, highScore, playerShip, displayText, displayTextAlpha;
      let isGameStarted = false;
      let isGamePaused = false;

      let particles = [];
      const PARTICLE_LIFESPAN = 30;
      const PARTICLE_SIZE = 2;
      const PARTICLE_COUNT = 15;

      newGame();

      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("keyup", handleKeyUp);
      setInterval(updateGame, 1000 / FPS);

      document.getElementById("startButton").addEventListener("click", startGame);
      document.getElementById("pauseButton").addEventListener("click", function () {
        if (isGameStarted && !playerShip.dead) {
          togglePause();
        }
      });
      window.addEventListener("resize", handleCanvasResize);

      function handleCanvasResize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if (playerShip) {
          playerShip.x = canvas.width / 2;
          playerShip.y = canvas.height / 2;
        }
      }

      function createAsteroidBelt() {
        asteroids = [];
        totalAsteroids = (STARTING_ASTEROID_COUNT + currentLevel) * 7;
        asteroidsLeft = totalAsteroids;

        if (currentLevel + 1 === BOSS_LEVEL) {
          let x = Math.random() * canvas.width;
          let y = Math.random() * canvas.height;
          asteroids.push(newBossAsteroid(x, y));
          totalAsteroids = 1;
          asteroidsLeft = 1;
        } else {
          let x, y;
          for (let i = 0; i < STARTING_ASTEROID_COUNT + currentLevel; i++) {
            do {
              x = Math.floor(Math.random() * canvas.width);
              y = Math.floor(Math.random() * canvas.height);
            } while (
              distanceBetweenPoints(playerShip.x, playerShip.y, x, y) <
              ASTEROID_INITIAL_SIZE * 2 + playerShip.r
            );
            asteroids.push(newAsteroid(x, y, Math.ceil(ASTEROID_INITIAL_SIZE / 2)));
          }
        }
      }

      function newBossAsteroid(x, y) {
        return {
          x: x,
          y: y,
          xv: BOSS_SPEED / FPS,
          yv: BOSS_SPEED / FPS,
          a: Math.random() * Math.PI * 2,
          rot: Math.PI / FPS / 4,
          r: BOSS_SIZE,
          hp: BOSS_HP,
          isBoss: true,
          img: bossImage,
        };
      }

      function createParticles(x, y, color, count, speedFactor = 1) {
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = (Math.random() * ASTEROID_BASE_SPEED / 2 * speedFactor) / FPS;
          particles.push({
            x: x,
            y: y,
            xv: Math.cos(angle) * speed,
            yv: Math.sin(angle) * speed,
            color: color,
            life: PARTICLE_LIFESPAN,
            size: PARTICLE_SIZE * Math.random() + 1
          });
        }
      }

      function destroyAsteroid(index) {
        let asteroid = asteroids[index];
        let x = asteroid.x;
        let y = asteroid.y;
        let radius = asteroid.r / 1.2;

        createParticles(x, y, "rgba(255, 255, 255, 0.8)", PARTICLE_COUNT);

        if (asteroid.isBoss) {
          asteroid.hp--;
          if (asteroid.hp <= 0) {
            asteroids.splice(index, 1);
            score += POINTS_LARGE_ASTEROID * 5;
            fxHit.play();

            if (asteroids.length == 0) {
              currentLevel++;
              setTimeout(newLevel, 1000);
            }
          }
          return;
        }

        if (radius == Math.ceil(ASTEROID_INITIAL_SIZE / 2)) {
          asteroids.push(newAsteroid(x, y, Math.ceil(ASTEROID_INITIAL_SIZE / 4)));
          asteroids.push(newAsteroid(x, y, Math.ceil(ASTEROID_INITIAL_SIZE / 4)));
          score += POINTS_LARGE_ASTEROID;
        } else if (radius == Math.ceil(ASTEROID_INITIAL_SIZE / 4)) {
          asteroids.push(newAsteroid(x, y, Math.ceil(ASTEROID_INITIAL_SIZE / 8)));
          asteroids.push(newAsteroid(x, y, Math.ceil(ASTEROID_INITIAL_SIZE / 8)));
          score += POINTS_MEDIUM_ASTEROID;
        } else if (radius == Math.ceil(ASTEROID_INITIAL_SIZE / 8)) {
          score += POINTS_SMALL_ASTEROID;
        } else {
          score += POINTS_SMALL_ASTEROID;
        }

        if (score > highScore) {
          highScore = score;
          localStorage.setItem(HIGH_SCORE_KEY, highScore);
        }

        asteroids.splice(index, 1);
        fxHit.play();

        asteroidsLeft--;
        gameMusic.setAsteroidRatio(asteroidsLeft / totalAsteroids);

        if (asteroids.length == 0) {
          currentLevel++;
          setTimeout(newLevel, 1000);
        }
      }

      function distanceBetweenPoints(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      }

      function drawPlayerShip(x, y, angle, color = "white") {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        const rocketWidth = playerShip.r * 5;
        const rocketHeight = playerShip.r * 5;

        ctx.drawImage(
          rocketImage,
          -rocketWidth / 2,
          -rocketHeight / 2,
          rocketWidth,
          rocketHeight
        );

        ctx.restore();

        if (SHOW_COLLISION_BOUNDING) {
          ctx.strokeStyle = "lime";
          ctx.beginPath();
          ctx.arc(x, y, playerShip.r, 0, Math.PI * 2, false);
          ctx.stroke();
        }
      }

      function explodePlayerShip() {
        playerShip.explodeTime = Math.ceil(PLAYER_EXPLOSION_DURATION * FPS);
        fxExplosion.play();
        createParticles(playerShip.x, playerShip.y, "orange", 50, 2);
      }

      function gameOver() {
        playerShip.dead = true;
        displayText = "Game Over";
        displayTextAlpha = 1.0;
        showMainScreen();
      }

      function handleKeyDown(event) {
        if (playerShip.dead) {
          return;
        }

        switch (event.keyCode) {
          case 32:
            playerShip.shooting = true;
            break;
          case 37:
            playerShip.rot = ((-PLAYER_TURN_SPEED / 180) * Math.PI) / FPS;
            break;
          case 38:
            playerShip.thrusting = true;
            break;
          case 39:
            playerShip.rot = ((PLAYER_TURN_SPEED / 180) * Math.PI) / FPS;
            break;
          case 80:
          case 27:
            if (isGameStarted) {
              togglePause();
            }
            break;
        }
      }

      function handleKeyUp(event) {
        if (!isGameStarted || playerShip.dead) {
          return;
        }

        switch (event.keyCode) {
          case 32:
            playerShip.shooting = false;
            playerShip.canShoot = true;
            break;
          case 37:
            playerShip.rot = 0;
            break;
          case 38:
            playerShip.thrusting = false;
            break;
          case 39:
            playerShip.rot = 0;
            break;
        }
      }

      function newAsteroid(x, y, radius) {
        const levelMultiplier = 1 + 0.3 * currentLevel;
        const asteroid = {
          x: x,
          y: y,
          xv:
            ((Math.random() * ASTEROID_BASE_SPEED * levelMultiplier) / FPS) *
            (Math.random() < 0.5 ? 1 : -1),
          yv:
            ((Math.random() * ASTEROID_BASE_SPEED * levelMultiplier) / FPS) *
            (Math.random() < 0.5 ? 1 : -1),
          a: Math.random() * Math.PI * 2,
          rot:
            (((Math.random() * Math.PI) / FPS) *
              (Math.random() < 0.5 ? 1 : -1)) /
            4,
          r: radius < ASTEROID_SMALLEST_SIZE ? ASTEROID_SMALLEST_SIZE : radius * 1.2,
          offs: [],
          vert: Math.floor(
            Math.random() * (ASTEROID_VERTICES + 1) + ASTEROID_VERTICES / 2
          ),
          img: asteroidImages[Math.floor(Math.random() * asteroidImages.length)],
          aspectRatio: 1.2 + Math.random() * 0.2,
        };

        for (let i = 0; i < asteroid.vert; i++) {
          asteroid.offs.push(Math.random() * ASTEROID_JAGGEDNESS * 2 + 1 - ASTEROID_JAGGEDNESS);
        }

        return asteroid;
      }

      function newGame() {
        currentLevel = 0;
        playerLives = GAME_LIVES;
        score = 0;
        playerShip = createPlayerShip();

        let scoreString = localStorage.getItem(HIGH_SCORE_KEY);
        if (scoreString == null) {
          highScore = 0;
        } else {
          highScore = parseInt(scoreString);
        }

        if (!isGameStarted) {
          asteroids = [];
          for (let i = 0; i < TITLE_SCREEN_ASTEROID_COUNT; i++) {
            let x = Math.random() * canvas.width;
            let y = Math.random() * canvas.height;
            asteroids.push(newAsteroid(x, y, Math.ceil(ASTEROID_INITIAL_SIZE / 2)));
          }
        } else {
          newLevel();
        }
      }

      function newLevel() {
        gameMusic.setAsteroidRatio(1);
        displayText = "Level " + (currentLevel + 1);
        displayTextAlpha = 1.0;
        createAsteroidBelt();
        if (currentLevel >= 0) {
          createBlackHole();
          document.getElementById("blackHole").style.display = "block";
        } else {
          document.getElementById("blackHole").style.display = "none";
        }
      }

      function createPlayerShip() {
        return {
          x: canvas.width / 2,
          y: canvas.height / 2,
          a: 0,
          r: PLAYER_SHIP_SIZE / 2,
          blinkNum: Math.ceil(PLAYER_INVINCIBILITY_DURATION / PLAYER_BLINK_DURATION),
          blinkTime: Math.ceil(PLAYER_BLINK_DURATION * FPS),
          canShoot: true,
          dead: false,
          explodeTime: 0,
          lasers: [],
          rot: 0,
          thrusting: false,
          thrust: {
            x: 0,
            y: 0,
          },
          shooting: false,
          laserReloadTime: 0,
        };
      }

      function shootLaser() {
        if (playerShip.lasers.length < MAX_LASERS) {
          playerShip.lasers.push({
            x: playerShip.x + (4 / 3) * playerShip.r * Math.cos(playerShip.a),
            y: playerShip.y + (4 / 3) * playerShip.r * Math.sin(playerShip.a),
            xv: (LASER_SPEED * Math.cos(playerShip.a)) / FPS,
            yv: (LASER_SPEED * Math.sin(playerShip.a)) / FPS,
            dist: 0,
            explodeTime: 0,
          });
          fxLaser.play();
        }
      }

      function Music(srcLow, srcHigh) {
        this.soundLow = new Audio(srcLow);
        this.soundHigh = new Audio(srcHigh);
        this.low = true;
        this.tempo = 1.0;
        this.beatTime = 0;

        this.play = function () {
          if (MUSIC_ENABLED) {
            if (this.low) {
              this.soundLow.play();
            } else {
              this.soundHigh.play();
            }
            this.low = !this.low;
          }
        };

        this.setAsteroidRatio = function (ratio) {
          this.tempo = 1.0 - 0.75 * (1.0 - ratio);
        };

        this.tick = function () {
          if (this.beatTime == 0) {
            this.play();
            this.beatTime = Math.ceil(this.tempo * FPS);
          } else {
            this.beatTime--;
          }
        };
      }

      function Sound(src, maxStreams = 1, vol = 1.0) {
        this.streamNum = 0;
        this.streams = [];
        for (let i = 0; i < maxStreams; i++) {
          this.streams.push(new Audio(src));
          this.streams[i].volume = vol;
        }

        this.play = function () {
          if (SOUND_ENABLED) {
            this.streamNum = (this.streamNum + 1) % maxStreams;
            this.streams[this.streamNum].play();
          }
        };

        this.stop = function () {
          this.streams[this.streamNum].pause();
          this.streams[this.streamNum].currentTime = 0;
        };
      }

      function updateGame() {
        if (isGamePaused) return;

        let isBlinking = playerShip.blinkNum % 2 == 0;
        let isExploding = playerShip.explodeTime > 0;

        gameMusic.tick();

        ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);

        if (currentLevel + 1 === BOSS_LEVEL && asteroids.length > 0 && asteroids[0].isBoss) {
          drawBossHealthBar(asteroids[0].hp, BOSS_HP);
        }

        drawAsteroids();
        updateParticles();
        drawParticles();

        if (isGameStarted) {
          updatePlayerShipMovement(isExploding, isBlinking);
          renderPlayerShip(isExploding, isBlinking);
          updatePlayerInvincibility();
          drawLasers();
          drawGameText();
          drawLivesIndicator(isExploding);
          updatePauseButtonPosition();
          drawScore();
          drawHighScore();
          handleLaserAsteroidCollisions();
          handlePlayerAsteroidCollisions(isExploding, isBlinking);
          wrapPlayerShipPosition();
          managePlayerShooting();
          updateLasers();
          attractShipToBlackHole();
        }

        updateAsteroids();
      }

      function updatePlayerShipMovement(isExploding, isBlinking) {
        if (playerShip.thrusting && !playerShip.dead) {
          playerShip.thrust.x += (PLAYER_SHIP_THRUST * Math.cos(playerShip.a)) / FPS;
          playerShip.thrust.y += (PLAYER_SHIP_THRUST * Math.sin(playerShip.a)) / FPS;
          fxThrust.play();

          if (!isExploding && isBlinking) {
            ctx.fillStyle = "orange";
            ctx.strokeStyle = "yellow";
            ctx.lineWidth = PLAYER_SHIP_SIZE / 10;
            ctx.beginPath();
            ctx.moveTo(
              playerShip.x -
                playerShip.r *
                  ((2 / 3) * Math.cos(playerShip.a) + 0.5 * Math.sin(playerShip.a)),
              playerShip.y -
                playerShip.r * ((2 / 3) * Math.sin(playerShip.a) - 0.5 * Math.cos(playerShip.a))
            );
            ctx.lineTo(
              playerShip.x - ((playerShip.r * 6) / 3) * Math.cos(playerShip.a),
              playerShip.y - ((playerShip.r * 6) / 3) * Math.sin(playerShip.a)
            );
            ctx.lineTo(
              playerShip.x -
                playerShip.r *
                  ((2 / 3) * Math.cos(playerShip.a) - 0.5 * Math.sin(playerShip.a)),
              playerShip.y -
                playerShip.r * ((2 / 3) * Math.sin(playerShip.a) + 0.5 * Math.cos(playerShip.a))
            );
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        } else {
          playerShip.thrust.x -= (FRICTION * playerShip.thrust.x) / FPS;
          playerShip.thrust.y -= (FRICTION * playerShip.thrust.y) / FPS;
          fxThrust.stop();
        }
      }

      function renderPlayerShip(isExploding, isBlinking) {
        if (!isExploding) {
          if (isBlinking && !playerShip.dead) {
            drawPlayerShip(playerShip.x, playerShip.y, playerShip.a);
          }
        } else {
          ctx.fillStyle = "darkred";
          ctx.beginPath();
          ctx.arc(playerShip.x, playerShip.y, playerShip.r * 1.7, 0, Math.PI * 2, false);
          ctx.fill();
          ctx.fillStyle = "red";
          ctx.beginPath();
          ctx.arc(playerShip.x, playerShip.y, playerShip.r * 1.4, 0, Math.PI * 2, false);
          ctx.fill();
          ctx.fillStyle = "orange";
          ctx.beginPath();
          ctx.arc(playerShip.x, playerShip.y, playerShip.r * 1.1, 0, Math.PI * 2, false);
          ctx.fill();
          ctx.fillStyle = "yellow";
          ctx.beginPath();
          ctx.arc(playerShip.x, playerShip.y, playerShip.r * 0.8, 0, Math.PI * 2, false);
          ctx.fill();
          ctx.fillStyle = "white";
          ctx.beginPath();
          ctx.arc(playerShip.x, playerShip.y, playerShip.r * 0.5, 0, Math.PI * 2, false);
          ctx.fill();
        }

        if (SHOW_COLLISION_BOUNDING) {
          ctx.strokeStyle = "lime";
          ctx.beginPath();
          ctx.arc(playerShip.x, playerShip.y, playerShip.r, 0, Math.PI * 2, false);
          ctx.stroke();
        }

        if (SHOW_SHIP_CENTER_DOT) {
          ctx.fillStyle = "red";
          ctx.fillRect(playerShip.x - 1, playerShip.y - 1, 2, 2);
        }
      }

      function updatePlayerInvincibility() {
        if (playerShip.blinkNum > 0) {
          playerShip.blinkTime--;

          if (playerShip.blinkTime == 0) {
            playerShip.blinkTime = Math.ceil(PLAYER_BLINK_DURATION * FPS);
            playerShip.blinkNum--;
          }
        }
      }

      function drawLasers() {
        for (let i = 0; i < playerShip.lasers.length; i++) {
          if (playerShip.lasers[i].explodeTime == 0) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = "#00ffff";

            ctx.fillStyle = "#00ffff";
            ctx.beginPath();
            ctx.arc(
              playerShip.lasers[i].x,
              playerShip.lasers[i].y,
              PLAYER_SHIP_SIZE / 10,
              0,
              Math.PI * 2,
              false
            );
            ctx.fill();

            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(
              playerShip.lasers[i].x,
              playerShip.lasers[i].y,
              PLAYER_SHIP_SIZE / 15,
              0,
              Math.PI * 2,
              false
            );
            ctx.fill();

            ctx.shadowBlur = 0;
          } else {
            ctx.fillStyle = "#00ffff";
            ctx.beginPath();
            ctx.arc(
              playerShip.lasers[i].x,
              playerShip.lasers[i].y,
              playerShip.r * 0.75,
              0,
              Math.PI * 2,
              false
            );
            ctx.fill();
            ctx.fillStyle = "#40ffff";
            ctx.beginPath();
            ctx.arc(
              playerShip.lasers[i].x,
              playerShip.lasers[i].y,
              playerShip.r * 0.5,
              0,
              Math.PI * 2,
              false
            );
            ctx.fill();
            ctx.fillStyle = "#80ffff";
            ctx.beginPath();
            ctx.arc(
              playerShip.lasers[i].x,
              playerShip.lasers[i].y,
              playerShip.r * 0.25,
              0,
              Math.PI * 2,
              false
            );
            ctx.fill();
          }
        }
      }

      function drawGameText() {
        if (displayTextAlpha >= 0) {
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "rgba(255, 255, 255, " + displayTextAlpha + ")";
          ctx.font = "small-caps " + TEXT_FONT_SIZE + "px dejavu sans mono";
          ctx.fillText(displayText, canvas.width / 2, canvas.height * 0.75);
          displayTextAlpha -= 1.0 / TEXT_FADE_TIME / FPS;
        }
      }

      function drawLivesIndicator(isExploding) {
        let lifeColor;
        for (let i = 0; i < playerLives; i++) {
          lifeColor = isExploding && i == playerLives - 1 ? "red" : "white";
          drawPlayerShip(
            PLAYER_SHIP_SIZE + i * PLAYER_SHIP_SIZE * 1.2,
            PLAYER_SHIP_SIZE,
            0.5 * Math.PI,
            lifeColor
          );
        }
      }

      function updatePauseButtonPosition() {
        let pauseButton = document.getElementById("pauseButton");
        let canvasRect = canvas.getBoundingClientRect();
        pauseButton.style.top = canvasRect.top + PLAYER_SHIP_SIZE - 10 + "px";
        pauseButton.style.left = canvasRect.left + PLAYER_SHIP_SIZE * 5 + "px";
      }

      function drawScore() {
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "white";
        ctx.font = TEXT_FONT_SIZE + "px dejavu sans mono";
        ctx.fillText(score, canvas.width - PLAYER_SHIP_SIZE / 2, PLAYER_SHIP_SIZE);
      }

      function drawHighScore() {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "white";
        ctx.font = TEXT_FONT_SIZE * 0.75 + "px dejavu sans mono";
        ctx.fillText("BEST " + highScore, canvas.width / 2, PLAYER_SHIP_SIZE);
      }

      function handleLaserAsteroidCollisions() {
        for (let i = asteroids.length - 1; i >= 0; i--) {
          let asteroidX = asteroids[i].x;
          let asteroidY = asteroids[i].y;
          let asteroidRadius = asteroids[i].r;

          for (let j = playerShip.lasers.length - 1; j >= 0; j--) {
            let laserX = playerShip.lasers[j].x;
            let laserY = playerShip.lasers[j].y;

            if (
              playerShip.lasers[j].explodeTime == 0 &&
              distanceBetweenPoints(asteroidX, asteroidY, laserX, laserY) < asteroidRadius
            ) {
              destroyAsteroid(i);
              playerShip.lasers[j].explodeTime = Math.ceil(LASER_EXPLOSION_DURATION * FPS);
              break;
            }
          }
        }
      }

      function handlePlayerAsteroidCollisions(isExploding, isBlinking) {
        if (!isExploding) {
          if (playerShip.blinkNum == 0 && !playerShip.dead) {
            for (let i = 0; i < asteroids.length; i++) {
              if (
                distanceBetweenPoints(playerShip.x, playerShip.y, asteroids[i].x, asteroids[i].y) <
                playerShip.r + asteroids[i].r
              ) {
                explodePlayerShip();
                destroyAsteroid(i);
                break;
              }
            }
          }
        } else {
          playerShip.explodeTime--;

          if (playerShip.explodeTime == 0) {
            playerLives--;
            if (playerLives == 0) {
              gameOver();
            } else {
              playerShip = createPlayerShip();
            }
          }
        }

        playerShip.a += playerShip.rot;
        playerShip.x += playerShip.thrust.x;
        playerShip.y += playerShip.thrust.y;
      }

      function wrapPlayerShipPosition() {
        if (playerShip.x < 0 - playerShip.r) {
          playerShip.x = canvas.width + playerShip.r;
        } else if (playerShip.x > canvas.width + playerShip.r) {
          playerShip.x = 0 - playerShip.r;
        }
        if (playerShip.y < 0 - playerShip.r) {
          playerShip.y = canvas.height + playerShip.r;
        } else if (playerShip.y > canvas.height + playerShip.r) {
          playerShip.y = 0 - playerShip.r;
        }
      }

      function managePlayerShooting() {
        if (playerShip.shooting && playerShip.laserReloadTime == 0) {
          shootLaser();
          playerShip.laserReloadTime = Math.ceil(LASER_RELOAD_COOLDOWN * FPS);
        }
        if (playerShip.laserReloadTime > 0) {
          playerShip.laserReloadTime--;
        }
      }

      function updateLasers() {
        for (let i = playerShip.lasers.length - 1; i >= 0; i--) {
          if (playerShip.lasers[i].dist > LASER_DIST_FACTOR * canvas.width) {
            playerShip.lasers.splice(i, 1);
            continue;
          }

          if (playerShip.lasers[i].explodeTime > 0) {
            playerShip.lasers[i].explodeTime--;

            if (playerShip.lasers[i].explodeTime == 0) {
              playerShip.lasers.splice(i, 1);
              continue;
            }
          } else {
            playerShip.lasers[i].x += playerShip.lasers[i].xv;
            playerShip.lasers[i].y += playerShip.lasers[i].yv;

            playerShip.lasers[i].dist += Math.sqrt(
              Math.pow(playerShip.lasers[i].xv, 2) + Math.pow(playerShip.lasers[i].yv, 2)
            );
          }

          if (
            playerShip.lasers[i].x < 0 ||
            playerShip.lasers[i].x > canvas.width ||
            playerShip.lasers[i].y < 0 ||
            playerShip.lasers[i].y > canvas.height
          ) {
            playerShip.lasers.splice(i, 1);
          }
        }
      }

      function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
          let p = particles[i];
          p.x += p.xv;
          p.y += p.yv;
          p.life--;
          if (p.life <= 0) {
            particles.splice(i, 1);
          }
        }
      }

      function drawParticles() {
        for (let i = 0; i < particles.length; i++) {
          let p = particles[i];
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life / PARTICLE_LIFESPAN;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2, false);
          ctx.fill();
        }
        ctx.globalAlpha = 1.0;
      }

      function updateAsteroids() {
        for (let i = 0; i < asteroids.length; i++) {
          asteroids[i].x += asteroids[i].xv;
          asteroids[i].y += asteroids[i].yv;

          if (asteroids[i].x < 0 - asteroids[i].r) {
            asteroids[i].x = canvas.width + asteroids[i].r;
          } else if (asteroids[i].x > canvas.width + asteroids[i].r) {
            asteroids[i].x = 0 - asteroids[i].r;
          }
          if (asteroids[i].y < 0 - asteroids[i].r) {
            asteroids[i].y = canvas.height + asteroids[i].r;
          } else if (asteroids[i].y > canvas.height + asteroids[i].r) {
            asteroids[i].y = 0 - asteroids[i].r;
          }
        }
      }

      function createBlackHole() {
        blackHole.x = Math.random() * canvas.width;
        blackHole.y = Math.random() * canvas.height;
        document.getElementById("blackHole").style.left = blackHole.x - BLACK_HOLE_SIZE / 2 + "px";
        document.getElementById("blackHole").style.top = blackHole.y - BLACK_HOLE_SIZE / 2 + "px";
      }

      function attractShipToBlackHole() {
        const dx = blackHole.x - playerShip.x;
        const dy = blackHole.y - playerShip.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < BLACK_HOLE_SIZE * 10 && dist > 20) {
          const force = BLACK_HOLE_ATTRACTION_FORCE / (dist * dist);
          playerShip.thrust.x += force * dx;
          playerShip.thrust.y += force * dy;
        }
      }

      function drawBossHealthBar(currentHp, maxHp) {
        const barWidth = 200;
        const barHeight = 30;
        const barX = 300;
        const barY = 22;
        const cornerRadius = 8;

        ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;

        ctx.beginPath();
        ctx.moveTo(barX + cornerRadius, barY);
        ctx.lineTo(barX + barWidth - cornerRadius, barY);
        ctx.arcTo(barX + barWidth, barY, barX + barWidth, barY + cornerRadius, cornerRadius);
        ctx.lineTo(barX + barWidth, barY + barHeight - cornerRadius);
        ctx.arcTo(barX + barWidth, barY + barHeight, barX + barWidth - cornerRadius, barY + barHeight, cornerRadius);
        ctx.lineTo(barX + cornerRadius, barY + barHeight);
        ctx.arcTo(barX, barY + barHeight, barX, barY + barHeight - cornerRadius, cornerRadius);
        ctx.lineTo(barX, barY + cornerRadius);
        ctx.arcTo(barX, barY, barX + cornerRadius, barY, cornerRadius);
        ctx.closePath();

        ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
        ctx.fill();

        ctx.strokeStyle = "white";
        ctx.lineWidth = 5;
        ctx.stroke();

        const currentHealthWidth = barWidth * (currentHp / maxHp);

        ctx.beginPath();
        ctx.moveTo(barX, barY);
        ctx.lineTo(barX + currentHealthWidth - cornerRadius, barY);

        if (currentHealthWidth > cornerRadius) {
          ctx.arcTo(barX + currentHealthWidth, barY, barX + currentHealthWidth, barY + cornerRadius, cornerRadius);
        } else {
          ctx.lineTo(barX + currentHealthWidth, barY);
        }

        ctx.lineTo(barX + currentHealthWidth, barY + barHeight - cornerRadius);

        if (currentHealthWidth > cornerRadius) {
          ctx.arcTo(barX + currentHealthWidth, barY + barHeight, barX + currentHealthWidth - cornerRadius, barY + barHeight, cornerRadius);
        } else {
          ctx.lineTo(barX + currentHealthWidth, barY + barHeight);
        }

        ctx.lineTo(barX, barY + barHeight);
        ctx.closePath();

        ctx.fillStyle = "rgba(0, 255, 0, 0.7)";
        ctx.fill();

        ctx.shadowColor = "rgba(0, 0, 0, 0)";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = "white";
        ctx.font = "16px Arial";
        ctx.textAlign = "left";
        ctx.fillText("BOSS HP", barX + 5, barY + 17);
      }

      function drawAsteroids() {
        for (let i = 0; i < asteroids.length; i++) {
          let asteroid = asteroids[i];

          ctx.save();
          ctx.translate(asteroid.x, asteroid.y);
          ctx.rotate(asteroid.a);

          if (asteroid.isBoss) {
            ctx.scale(1.0, 1.2);
            ctx.drawImage(asteroid.img, -asteroid.r, -asteroid.r, asteroid.r * 2, asteroid.r * 2);
          } else {
            ctx.scale(1.0, asteroid.aspectRatio);
            ctx.drawImage(asteroid.img, -asteroid.r, -asteroid.r, asteroid.r * 2, asteroid.r * 2);
          }

          ctx.restore();
          asteroid.a += asteroid.rot;
        }
      }

      function startGame() {
        document.getElementById("gameLogo").style.display = "none";
        document.getElementById("startButton").style.display = "none";
        document.getElementById("pauseButton").style.display = "block";

        isGameStarted = true;
        newGame();
      }

      function togglePause() {
        isGamePaused = !isGamePaused;
        if (isGamePaused) {
          document.getElementById("pauseMenu").style.display = "block";
          fxThrust.stop();
        } else {
          document.getElementById("pauseMenu").style.display = "none";
        }
      }

      function resumeGame() {
        togglePause();
      }

      function showMainScreen() {
        isGameStarted = false;
        isGamePaused = false;
        document.getElementById("pauseMenu").style.display = "none";
        document.getElementById("pauseButton").style.display = "none";
        document.getElementById("gameLogo").style.display = "block";
        document.getElementById("startButton").style.display = "block";
        document.getElementById("blackHole").style.display = "none";
        newGame();
      }