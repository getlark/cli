import readline from "node:readline";

export async function promptText(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    return await new Promise<string>((resolve) => {
      rl.question(question, (answer) => resolve(answer));
    });
  } finally {
    rl.close();
  }
}

export async function promptSecret(question: string): Promise<string> {
  const stdin = process.stdin;
  if (!stdin.isTTY) {
    return promptText(question);
  }

  process.stdout.write(question);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");

  return new Promise<string>((resolve, reject) => {
    let input = "";

    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off("data", onData);
    };

    const onData = (chunk: string) => {
      for (const char of chunk) {
        const code = char.charCodeAt(0);
        // Enter (LF, CR) or Ctrl-D (EOT)
        if (char === "\n" || char === "\r" || code === 0x04) {
          cleanup();
          process.stdout.write("\n");
          resolve(input);
          return;
        }
        // Ctrl-C (ETX)
        if (code === 0x03) {
          cleanup();
          process.stdout.write("\n");
          reject(new Error("Aborted."));
          return;
        }
        // Backspace (BS) or Delete (DEL)
        if (code === 0x08 || code === 0x7f) {
          if (input.length > 0) input = input.slice(0, -1);
          continue;
        }
        if (code >= 32) input += char;
      }
    };

    stdin.on("data", onData);
  });
}
