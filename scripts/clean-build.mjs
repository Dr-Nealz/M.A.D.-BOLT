import fs from "fs";
import path from "path";

const dirs = ["dist", "build/client", "build/server", "build/electron"];
for (const d of dirs) {
    const full = path.resolve(process.cwd(), d);
    if (fs.existsSync(full)) {
        fs.rmSync(full, { recursive: true, force: true });
        console.log("Cleaned:", d);
    }
}
console.log("Ready for build.");
