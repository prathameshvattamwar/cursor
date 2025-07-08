document.addEventListener('DOMContentLoaded', () => {
    const cursorContainer = document.getElementById('cursor-container');
    const dot = document.getElementById('cursor-dot');
    const outline = document.getElementById('cursor-outline');
    const styleGrid = document.getElementById('style-grid');
    const scribbleCanvas = document.getElementById('scribble-canvas');
    const scribbleCtx = scribbleCanvas.getContext('2d');

    let mouseX = 0, mouseY = 0, prevMouseX = 0, prevMouseY = 0;
    let dotX = 0, dotY = 0, outlineX = 0, outlineY = 0;
    let velX = 0, velY = 0;
    let currentStyle = 'aurora';
    let dynamicElements = [];
    let rippleTimeout, lastBubbleTime = 0, lastSnowflakeTime = 0;
    let isMouseDown = false, lastScribblePoint = null;

    const lerp = (start, end, amt) => (1 - amt) * start + amt * end;

    const setupEffect = (style) => {
        cleanupEffects();
        const createElements = (count, className, setupFn) => {
            for (let i = 0; i < count; i++) {
                const el = document.createElement('div');
                el.classList.add('cursor-dynamic-element', className);
                cursorContainer.appendChild(el);
                const props = { el, x: -100, y: -100 };
                if (setupFn) setupFn(props, i);
                dynamicElements.push(props);
            }
        };

        dot.style.display = 'block'; outline.style.display = 'block'; scribbleCanvas.style.display = 'none';
        
        const particleSetup = (p) => {
            p.x = Math.random() * window.innerWidth; p.y = Math.random() * window.innerHeight;
            p.vx = 0; p.vy = 0;
        };

        switch (style) {
            case 'aurora': createElements(20, 'aurora-segment'); break;
            case 'comet-trail': createElements(20, 'comet-dot'); break;
            case 'fairy-dust': createElements(50, 'dust-particle', particleSetup); break;
            case 'emoji': createElements(30, 'emoji-particle', p => { p.el.innerHTML = ['😂','❤️','👍','🔥','🎉'][Math.floor(Math.random()*5)]; particleSetup(p); }); break;
            case 'hyperspace': createElements(40, 'hyperspace-line', p => { p.life = 0; }); break;
            case 'clock':
                createElements(3, 'clock-hand', (p, i) => {
                    const types = ['hour', 'minute', 'second'];
                    p.el.style.backgroundColor = 'var(--heading-color)';
                    p.el.style.transformOrigin = 'bottom center';
                    if(types[i] === 'hour') { p.el.style.width = '3px'; p.el.style.height = '8px'; }
                    if(types[i] === 'minute') { p.el.style.width = '2px'; p.el.style.height = '12px'; }
                    if(types[i] === 'second') { p.el.style.width = '1px'; p.el.style.height = '15px'; p.el.style.backgroundColor = 'var(--primary-accent)'; }
                });
                break;
            case 'character':
                createElements(1, 'character-body', p => {
                    const lS = document.createElement('div'); lS.className = 'character-eye-socket left';
                    const rS = document.createElement('div'); rS.className = 'character-eye-socket right';
                    p.lP = document.createElement('div'); p.lP.className = 'character-pupil';
                    p.rP = document.createElement('div'); p.rP.className = 'character-pupil';
                    lS.appendChild(p.lP); rS.appendChild(p.rP);
                    p.el.append(lS, rS);
                });
                break;
            case 'ghost':
                createElements(1, 'ghost-body', p => {
                    const lE = document.createElement('div'); lE.className = 'ghost-eye left';
                    const rE = document.createElement('div'); rE.className = 'ghost-eye right';
                    p.el.append(lE, rE);
                });
                break;
            case 'scribble':
                scribbleCanvas.width = window.innerWidth; scribbleCanvas.height = window.innerHeight;
                scribbleCanvas.style.display = 'block';
                scribbleCtx.strokeStyle = 'rgba(255, 107, 107, 0.8)';
                scribbleCtx.lineWidth = 4;
                scribbleCtx.lineCap = 'round';
                break;
            default:
                if (['gooey', 'rainbow', 'text-flag', 'pixelated'].includes(style)) { outline.style.display = 'block'; }
                else { outline.style.display = 'block'; }
        }
        if (['aurora', 'comet-trail', 'fairy-dust', 'emoji', 'snowflakes', 'hyperspace', 'clock', 'ghost', 'character', 'text-flag'].includes(style)) dot.style.display = 'none';
        if (['aurora', 'comet-trail', 'fairy-dust', 'emoji', 'snowflakes', 'hyperspace', 'clock', 'ghost', 'character', 'gooey', 'stretchy', 'orbit'].includes(style)) outline.style.display = 'none';
    };

    const cleanupEffects = () => {
        dynamicElements.forEach(item => item.el.remove());
        dynamicElements = [];
        document.querySelectorAll('.bubble, .ripple-wave, .snowflake').forEach(e => e.remove());
        isMouseDown = false;
        lastScribblePoint = null;
    };

    const animate = () => {
        velX = mouseX - prevMouseX; velY = mouseY - prevMouseY;
        prevMouseX = mouseX; prevMouseY = mouseY;
        const speed = Math.sqrt(velX * velX + velY * velY);

        dotX = lerp(dotX, mouseX, 0.9); dotY = lerp(dotY, mouseY, 0.9);
        outlineX = lerp(outlineX, mouseX, 0.2); outlineY = lerp(outlineY, mouseY, 0.2);

        dot.style.transform = `translate(${dotX - 4}px, ${dotY - 4}px)`;
        outline.style.transform = `translate(${outlineX - 20}px, ${outlineY - 20}px)`;

        const applyTrail = (lerpAmount, rotate) => {
            dynamicElements.forEach((p, index) => {
                const targetX = (index === 0) ? mouseX : dynamicElements[index - 1].x;
                const targetY = (index === 0) ? mouseY : dynamicElements[index - 1].y;
                p.x = lerp(p.x, targetX, lerpAmount); p.y = lerp(p.y, targetY, lerpAmount);
                const angle = rotate ? Math.atan2(p.y - targetY, p.x - targetX) * (180 / Math.PI) : 0;
                p.el.style.transform = `translate(${p.x - p.el.offsetWidth/2}px, ${p.y - p.el.offsetHeight/2}px) rotate(${angle + 90}deg)`;
                p.el.style.opacity = 1 - index / dynamicElements.length;
            });
        };

        switch (currentStyle) {
            case 'aurora': applyTrail(0.4, true); break;
            case 'comet-trail': applyTrail(0.6, false); break;
            case 'stretchy':
                const scale = Math.min(Math.max(speed * 0.05, 1), 1.5);
                const angle = Math.atan2(velY, velX) * (180 / Math.PI);
                outline.style.display = 'block';
                outline.style.transform = `translate(${outlineX - 20}px, ${outlineY - 20}px) scale(${scale}, ${1/scale}) rotate(${angle}deg)`;
                break;
            case 'orbit':
                outline.style.display = 'block';
                const orbitRadius = 40 + Math.min(speed * 2, 40);
                const orbitAngle = performance.now() * 0.002;
                const satX = outlineX + orbitRadius * Math.cos(orbitAngle);
                const satY = outlineY + orbitRadius * Math.sin(orbitAngle);
                dot.style.transform = `translate(${satX - 4}px, ${satY - 4}px)`;
                break;
            case 'fairy-dust':
            case 'emoji':
                dynamicElements.forEach(p => {
                    const force = currentStyle === 'fairy-dust' ? 0.01 : 0;
                    const dx = mouseX - p.x, dy = mouseY - p.y;
                    p.vx += dx * force; p.vy += dy * force;
                    if (currentStyle === 'emoji' && speed > 2) {
                        const blastAngle = Math.atan2(velY, velX);
                        if(Math.sqrt(dx*dx + dy*dy) < 50) { p.vx -= Math.cos(blastAngle) * speed * 0.1; p.vy -= Math.sin(blastAngle) * speed * 0.1; }
                    }
                    p.vx *= 0.95; p.vy *= 0.95;
                    p.x += p.vx; p.y += p.vy;
                    p.el.style.transform = `translate(${p.x}px, ${p.y}px)`;
                });
                break;
            case 'hyperspace':
                dynamicElements.forEach(p => {
                    if (p.life <= 0 && speed > 10) {
                        p.x = mouseX; p.y = mouseY; p.life = 1;
                        p.angle = Math.atan2(velY, velX) + (Math.random() - 0.5) * 0.5;
                    }
                    if (p.life > 0) {
                        p.life -= 0.02;
                        const d = (1 - p.life) * 200;
                        const currentX = p.x + Math.cos(p.angle) * d;
                        const currentY = p.y + Math.sin(p.angle) * d;
                        const len = (1 - p.life) * 50;
                        p.el.style.height = `${len}px`;
                        p.el.style.opacity = p.life;
                        p.el.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${p.angle * 180 / Math.PI + 90}deg)`;
                    }
                });
                break;
            case 'clock':
                const d = new Date();
                const h = d.getHours(), m = d.getMinutes(), s = d.getSeconds();
                dynamicElements[0].el.style.transform = `translate(${outlineX-1.5}px, ${outlineY-8}px) rotate(${h*30 + m/2}deg)`;
                dynamicElements[1].el.style.transform = `translate(${outlineX-1}px, ${outlineY-12}px) rotate(${m*6}deg)`;
                dynamicElements[2].el.style.transform = `translate(${outlineX-0.5}px, ${outlineY-15}px) rotate(${s*6}deg)`;
                outline.style.display = 'block';
                break;
            case 'ghost':
                dynamicElements[0].el.style.transform = `translate(${outlineX - 15}px, ${outlineY - 20}px)`;
                dynamicElements[0].el.style.animationDuration = `${Math.max(0.5, 3 - speed * 0.1)}s`;
                break;
            case 'character':
                const body = dynamicElements[0];
                body.el.style.transform = `translate(${outlineX - 15}px, ${outlineY - 15}px)`;
                const pupilAngle = Math.atan2(velY, velX);
                const pupilDist = Math.min(speed*0.2, 2.5);
                const pupilX = Math.cos(pupilAngle) * pupilDist;
                const pupilY = Math.sin(pupilAngle) * pupilDist;
                body.lP.style.transform = `translate(${pupilX}px, ${pupilY}px)`;
                body.rP.style.transform = `translate(${pupilX}px, ${pupilY}px)`;
                break;
        }
        if(currentStyle === 'scribble') {
            scribbleCtx.fillStyle = 'rgba(255, 248, 240, 0.1)';
            scribbleCtx.fillRect(0, 0, scribbleCanvas.width, scribbleCanvas.height);
        }
        requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX; mouseY = e.clientY;
        if (currentStyle === 'ripple') {
            clearTimeout(rippleTimeout);
            rippleTimeout = setTimeout(() => {
                const ripple = document.createElement('div');
                ripple.className = 'cursor-dynamic-element ripple-wave';
                ripple.style.transform = `translate(${mouseX - 2}px, ${mouseY - 2}px)`;
                cursorContainer.appendChild(ripple);
                setTimeout(() => ripple.remove(), 1000);
            }, 150);
        }
        if (currentStyle === 'bubbles' && performance.now() - lastBubbleTime > 50) {
            const bubble = document.createElement('div');
            const size = Math.random() * 20 + 10;
            bubble.className = 'cursor-dynamic-element bubble';
            bubble.style.width = `${size}px`; bubble.style.height = `${size}px`;
            bubble.style.left = `${mouseX + (Math.random() - 0.5) * 20}px`; bubble.style.top = `${mouseY + (Math.random() - 0.5) * 20}px`;
            bubble.addEventListener('mouseenter', () => { bubble.style.transition = 'transform 0.1s, opacity 0.1s'; bubble.style.transform = 'scale(1.5)'; bubble.style.opacity = '0'; setTimeout(() => bubble.remove(), 100); });
            cursorContainer.appendChild(bubble); lastBubbleTime = performance.now();
            setTimeout(() => bubble.remove(), 4000);
        }
        if (currentStyle === 'snowflakes' && performance.now() - lastSnowflakeTime > 100) {
            const flake = document.createElement('div');
            flake.innerHTML = '❄️'; flake.className = 'cursor-dynamic-element snowflake';
            flake.style.left = `${mouseX}px`; flake.style.top = `${mouseY}px`;
            flake.style.transition = `transform 5s linear, opacity 5s linear`;
            cursorContainer.appendChild(flake);
            requestAnimationFrame(() => {
                const endX = Math.random() * 200 - 100;
                const endY = 200;
                flake.style.transform = `translate(${endX}px, ${endY}px) rotate(360deg)`;
                flake.style.opacity = '0';
            });
            lastSnowflakeTime = performance.now();
            setTimeout(() => flake.remove(), 5000);
        }
        if (isMouseDown && currentStyle === 'scribble' && lastScribblePoint) {
            scribbleCtx.beginPath();
            scribbleCtx.moveTo(lastScribblePoint.x, lastScribblePoint.y);
            scribbleCtx.lineTo(mouseX, mouseY);
            scribbleCtx.stroke();
        }
        lastScribblePoint = { x: mouseX, y: mouseY };
    });

    styleGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.card');
        if (!card) return;
        currentStyle = card.dataset.style;
        document.body.dataset.cursorStyle = currentStyle;
        document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        setupEffect(currentStyle);
    });
    
    document.addEventListener('mousedown', () => { if (currentStyle === 'scribble') isMouseDown = true; });
    document.addEventListener('mouseup', () => { if (currentStyle === 'scribble') isMouseDown = false; lastScribblePoint = null; });

    document.querySelectorAll('a, button, .card').forEach(el => { el.addEventListener('mouseenter', () => cursorContainer.classList.add('is-hovering')); el.addEventListener('mouseleave', () => cursorContainer.classList.remove('is-hovering')); });
    document.querySelectorAll('[data-text-hover]').forEach(el => { el.addEventListener('mouseenter', () => cursorContainer.classList.add('is-text-hovering')); el.addEventListener('mouseleave', () => cursorContainer.classList.remove('is-text-hovering')); });
    document.querySelectorAll('[data-magnetic]').forEach(el => { el.addEventListener('mousemove', (event) => { const { clientX, clientY } = event; const { left, top, width, height } = el.getBoundingClientRect(); const centerX = left + width / 2; const centerY = top + height / 2; const deltaX = (centerX - clientX) * 0.4; const deltaY = (centerY - clientY) * 0.4; el.style.transform = `translate(${deltaX}px, ${deltaY}px)`; }); el.addEventListener('mouseleave', () => el.style.transform = 'translate(0, 0)'); });
    document.body.addEventListener('mouseleave', () => cursorContainer.classList.add('is-hidden'));
    document.body.addEventListener('mouseenter', () => cursorContainer.classList.remove('is-hidden'));

    setupEffect(currentStyle);
    animate();
});
