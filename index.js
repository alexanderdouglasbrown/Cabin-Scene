const rust = import('./pkg');

rust
    .then(m => {
        document.body.textContent = `1 + 2 = ${m.add(1, 2)}`
    })
    .catch(console.error);