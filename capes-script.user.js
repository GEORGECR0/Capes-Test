// ==UserScript==
// @name         Vortex Client Capes Test
// @namespace    http://tampermonkey.net/
// @version      Beta
// @description  Vortex Client for Bloxd.io with cape cycling
// @author       GEORGECR
// @homepageURL  https://georgecr0.github.io/Vortex-Client/
// @icon         https://i.postimg.cc/fRpcmPqN/Vortex-Logo.png
// @match        https://bloxd.io/*
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const capeImages = [
        'https://i.postimg.cc/L8DgwChB/Vortex-Default-Cape-Red.png',
        'https://i.postimg.cc/pX5VmFyv/Vortex-Logo(2)(2).png',
        'https://i.postimg.cc/PqTdVVyQ/Vortex-Logo(2)(2)(1).png',
        'https://i.postimg.cc/hvznQkD1/Vortex-Logo(2)(2)(2).png'
    ];

    let currentCapeIndex = 0;

    const findAndLogNoa = () => {

        const isNoa = o =>
            o && typeof o === 'object' &&
            o.entities && typeof o.entities.getState === 'function' &&
            o.camera && typeof o.camera.getDirection === 'function' &&
            o.world && typeof o.world.getBlock === 'function';

        const isEntityMgr = o =>
            o && typeof o === 'object' &&
            o.entities && typeof o.entities.getState === 'function';

        function deepScan(obj, check, visited = new Set()) {
            if (!obj || typeof obj !== 'object' || visited.has(obj)) return null;
            visited.add(obj);

            try {
                if (check(obj)) return obj;
                for (const v of Object.values(obj)) {
                    const found = deepScan(v, check, visited);
                    if (found) return found;
                }
            } catch {}
            return null;
        }

        function walkFibers(f) {
            let node = f;
            let steps = 0;
            while (node && steps < 40) {
                if (node.memoizedProps) {
                    const match = deepScan(node.memoizedProps, isNoa) || deepScan(node.memoizedProps, isEntityMgr);
                    if (match) return match;
                }
                if (node.memoizedState) {
                    const match = deepScan(node.memoizedState, isNoa) || deepScan(node.memoizedState, isEntityMgr);
                    if (match) return match;
                }
                node = node.return;
                steps++;
            }
            return null;
        }

        let result = null;
        for (const el of document.querySelectorAll('*')) {
            const fKey = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
            if (fKey) {
                result = walkFibers(el[fKey]);
                if (result) break;
            }
        }

        if (result) {
            window._noa = result;
            result.entities.getState(1, "cape").chooseCape("super");

            function findCapeMesh(noaInstance) {
                try {
                    const capeComponent = noaInstance?.entities?.getState(1, "cape");
                    return capeComponent?.mesh;
                } catch (e) {
                    console.error("Error finding cape mesh:", e);
                    return null;
                }
            }

            function waitForCapeMesh(noaInstance, callback, retries = 20, delay = 500) {
                let attempts = 0;
                const interval = setInterval(() => {
                    const capeMesh = findCapeMesh(noaInstance);
                    if (capeMesh) {
                        clearInterval(interval);
                        callback(capeMesh);
                    } else {
                        attempts++;
                        if (attempts >= retries) {
                            clearInterval(interval);
                            console.log("Cape mesh not found.");
                        }
                    }
                }, delay);
            }

            waitForCapeMesh(result, (capeMesh) => {
                const mat = capeMesh?.material;
                if (!mat || !mat.diffuseTexture) return;

                const imageUrl = capeImages[currentCapeIndex];
                if (mat.diffuseTexture.updateURL) {
                    mat.diffuseTexture.updateURL(imageUrl);
                } else {
                    mat.diffuseTexture.url = imageUrl;
                }
                mat.diffuseTexture.hasAlpha = true;
                mat.diffuseTexture.markAsDirty?.();
                mat.markAsDirty?.();
            });

            console.log("Noa object initialized:", result);

        } else {
            console.log("%c✗ Could not find Noa instance", "color: #dc3545; font-weight: bold; font-size: 14px;");
        }
    };

    const changeCape = (noaInstance) => {
        const capeMesh = noaInstance?.entities?.getState(1, "cape")?.mesh;
        if (!capeMesh) return;

        const mat = capeMesh.material;
        if (!mat || !mat.diffuseTexture) return;

        currentCapeIndex = (currentCapeIndex + 1) % capeImages.length;
        const nextImage = capeImages[currentCapeIndex];

        if (mat.diffuseTexture.updateURL) {
            mat.diffuseTexture.updateURL(nextImage);
        } else {
            mat.diffuseTexture.url = nextImage;
        }

        mat.diffuseTexture.hasAlpha = true;
        mat.diffuseTexture.markAsDirty?.();
        mat.markAsDirty?.();

        console.log(`Cape changed to: ${nextImage}`);
    };

    // Add key listener for 'K'
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'k' && window._noa) {
            changeCape(window._noa);
        }
    });

    // Inject Find Noa button
    const injectButton = document.createElement('button');
    injectButton.textContent = 'Find Noa';
    injectButton.id = 'noa-injector-button';
    document.body.appendChild(injectButton);

    const style = document.createElement('style');
    style.textContent = `
        #noa-injector-button {
            position: fixed;
            top: 15px;
            right: 15px;
            z-index: 99999;
            background-color: #007bff;
            color: white;
            padding: 10px 18px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-family: sans-serif;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            transition: background-color 0.2s, transform 0.2s;
        }
        #noa-injector-button:hover {
            background-color: #0056b3;
            transform: translateY(-1px);
        }
        #noa-injector-button:active {
            transform: translateY(1px);
        }
    `;
    document.head.appendChild(style);

    injectButton.addEventListener('click', findAndLogNoa);

})();
