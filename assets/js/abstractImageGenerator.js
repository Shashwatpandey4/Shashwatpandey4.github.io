function generateAbstractImage(seed, width = 600, height = 400) {
    // Create canvas element
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Use the post title as a seed for randomization
    const random = new Math.seedrandom(seed);

    // Generate base gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    const hue1 = random() * 360;
    const hue2 = (hue1 + 30 + random() * 60) % 360; // Complementary-ish color
    gradient.addColorStop(0, `hsl(${hue1}, 70%, 80%)`);
    gradient.addColorStop(1, `hsl(${hue2}, 70%, 80%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add watercolor blobs
    for (let i = 0; i < 8; i++) {
        ctx.beginPath();

        // Create radial gradient for each blob
        const x = random() * width;
        const y = random() * height;
        const radius = random() * 150 + 50;

        const blobGradient = ctx.createRadialGradient(
            x, y, 0,
            x, y, radius
        );

        const hue = (hue1 + random() * 60) % 360;
        blobGradient.addColorStop(0, `hsla(${hue}, 70%, 60%, 0.3)`);
        blobGradient.addColorStop(0.5, `hsla(${hue}, 70%, 60%, 0.1)`);
        blobGradient.addColorStop(1, 'hsla(0, 0%, 100%, 0)');

        ctx.fillStyle = blobGradient;

        // Create irregular blob shape
        ctx.moveTo(x, y);
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
            const radiusVariation = radius * (0.8 + random() * 0.4);
            const bx = x + Math.cos(angle) * radiusVariation;
            const by = y + Math.sin(angle) * radiusVariation;

            if (angle === 0) {
                ctx.moveTo(bx, by);
            } else {
                const cp1x = x + Math.cos(angle - Math.PI / 16) * radiusVariation * 1.2;
                const cp1y = y + Math.sin(angle - Math.PI / 16) * radiusVariation * 1.2;
                ctx.quadraticCurveTo(cp1x, cp1y, bx, by);
            }
        }

        ctx.closePath();
        ctx.fill();
    }

    // Add some texture
    for (let i = 0; i < 100; i++) {
        const x = random() * width;
        const y = random() * height;
        const size = random() * 2 + 1;

        ctx.fillStyle = `hsla(${hue1}, 70%, 90%, ${random() * 0.1})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    // Apply slight blur for softer effect
    ctx.filter = 'blur(1px)';
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';

    // Convert canvas to data URL
    return canvas.toDataURL('image/png');
}