const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;
const IMAGE_TAG = process.env.IMAGE_TAG || "local";
const config = JSON.parse(process.env.APP_CONFIG);
app.get("/", (req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#f6f8fc">
    <meta name="description" content="A small Node.js service running on Amazon ECS Fargate, provisioned with Terraform.">
    <title>Northstar — ECS demo</title>
    <style>
      :root { color-scheme: light; --ink: #17243b; --muted: #66758d; --blue: #4969e8; --line: #e7ebf3; }
      * { box-sizing: border-box; }
      body { margin: 0; background: #f6f8fc; color: var(--ink); font: 15px/1.6 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      a { color: inherit; text-decoration: none; }
      .shell { width: min(1080px, calc(100% - 40px)); margin: 0 auto; }
      header { height: 76px; display: flex; align-items: center; justify-content: space-between; }
      .brand { display: flex; align-items: center; gap: 11px; font-weight: 750; letter-spacing: -.03em; }
      .brand-mark { display: grid; place-items: center; width: 35px; height: 35px; border-radius: 11px; background: #e7ecff; color: var(--blue); font-size: 19px; }
      .nav { display: flex; align-items: center; gap: 27px; color: var(--muted); font-size: 13px; }
      .nav a:hover { color: var(--ink); }
      .nav .github { color: var(--ink); font-weight: 650; }
      .hero { position: relative; overflow: hidden; margin-top: 30px; padding: 70px 72px; border-radius: 23px; color: white; background: linear-gradient(115deg, #182746 0%, #263e70 58%, #4864c9 100%); box-shadow: 0 22px 60px #243a711a; }
      .hero:after { content: ""; position: absolute; width: 390px; height: 390px; border: 1px solid #ffffff20; border-radius: 50%; right: -68px; top: -158px; box-shadow: 0 0 0 42px #ffffff0b, 0 0 0 84px #ffffff08; }
      .eyebrow { display: inline-flex; align-items: center; gap: 9px; color: #cbd7ff; text-transform: uppercase; letter-spacing: .13em; font-size: 11px; font-weight: 700; }
      .eyebrow i, .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #65dfb0; box-shadow: 0 0 0 4px #65dfb022; }
      h1 { max-width: 600px; margin: 19px 0 14px; font-size: clamp(38px, 5.6vw, 60px); line-height: 1.06; letter-spacing: -.055em; }
      .hero p { max-width: 550px; margin: 0; color: #d5def2; font-size: 16px; }
      .hero-actions { display: flex; gap: 12px; margin-top: 31px; }
      .button { display: inline-flex; align-items: center; gap: 8px; padding: 11px 16px; border: 1px solid #ffffff45; border-radius: 9px; font-size: 13px; font-weight: 650; }
      .button.primary { border-color: white; background: white; color: #253962; }
      .button:hover { transform: translateY(-1px); }
      .section-heading { display: flex; align-items: end; justify-content: space-between; margin: 46px 0 18px; }
      h2 { margin: 0; font-size: 19px; letter-spacing: -.035em; }
      .section-heading p { margin: 0; color: var(--muted); font-size: 12px; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
      .card { min-height: 159px; padding: 21px; border: 1px solid var(--line); border-radius: 14px; background: white; }
      .card-icon { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: #f0f3ff; color: var(--blue); font-size: 17px; }
      .card h3 { margin: 15px 0 3px; font-size: 14px; }
      .card p { margin: 0; color: var(--muted); font-size: 12px; }
      .runtime { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin: 17px 0 48px; padding: 18px 21px; border: 1px solid var(--line); border-radius: 14px; background: white; }
      .runtime-label { display: flex; align-items: center; gap: 11px; }
      .runtime-label strong { display: block; font-size: 13px; }
      .runtime-label span { display: block; color: var(--muted); font-size: 11px; }
      .tag { padding: 5px 10px; border-radius: 7px; background: #f1f4f9; color: #52617a; font: 11px ui-monospace, SFMono-Regular, Menlo, monospace; }
      footer { display: flex; justify-content: space-between; padding: 20px 0 27px; border-top: 1px solid var(--line); color: var(--muted); font-size: 11px; }
      @media (max-width: 700px) { .shell { width: min(100% - 28px, 540px); } header { height: 65px; } .nav { gap: 14px; } .nav a:first-child { display: none; } .hero { margin-top: 20px; padding: 48px 27px; } .hero:after { right: -250px; } .grid { grid-template-columns: 1fr; gap: 10px; } .card { min-height: 0; } .section-heading { align-items: start; flex-direction: column; gap: 4px; margin-top: 34px; } }
      @media (max-width: 420px) { .nav { gap: 10px; font-size: 12px; } .nav a:nth-child(2) { display: none; } .hero-actions { flex-wrap: wrap; } .runtime { align-items: start; flex-direction: column; gap: 12px; } footer { gap: 10px; flex-direction: column; } }
    </style>
  </head>
  <body>
    <div class="shell">
      <header>
        <a class="brand" href="/" aria-label="Northstar home"><span class="brand-mark">✳</span> northstar<span style="color:#8996ac;font-weight:500"> / ecs demo</span></a>
        <nav class="nav" aria-label="Main navigation">
          <a href="#architecture">Architecture</a>
          <a href="#runtime">Runtime</a>
          <a class="github" href="https://github.com/">GitHub ↗</a>
        </nav>
      </header>
      <main>
        <section class="hero">
          <div class="eyebrow"><i></i> Node.js on AWS Fargate</div>
          <h1>A small app.<br>A real cloud journey.</h1>
          <p>A simple Express website packaged in Docker and deployed to Amazon ECS. The infrastructure is described with Terraform, one building block at a time.</p>
          <div class="hero-actions">
            <a class="button primary" href="#architecture">Explore the setup <span aria-hidden="true">↓</span></a>
            <a class="button" href="/health">Check service health <span aria-hidden="true">↗</span></a>
          </div>
        </section>
        <section id="architecture" aria-labelledby="architecture-title">
          <div class="section-heading"><h2 id="architecture-title">What’s running behind this page</h2><p>A compact deployment, built from familiar pieces.</p></div>
          <div class="grid">
            <article class="card"><div class="card-icon" aria-hidden="true">⌘</div><h3>Express app</h3><p>Serves this page and a lightweight health endpoint on port 3000.</p></article>
            <article class="card"><div class="card-icon" aria-hidden="true">▧</div><h3>Container image</h3><p>Docker packages the Node.js app so it can run consistently across environments.</p></article>
            <article class="card"><div class="card-icon" aria-hidden="true">☁</div><h3>AWS infrastructure</h3><p>Terraform provisions a VPC, ECR repository, and an ECS Fargate service.</p></article>
          </div>
        </section>
        <section id="runtime" aria-labelledby="runtime-title">
          <div class="section-heading"><h2 id="runtime-title">Service snapshot</h2><p>Build details supplied to this container.</p></div>
          <div class="runtime"><div class="runtime-label"><span class="status-dot" aria-hidden="true"></span><div><strong>Web service is responding</strong><span>Express · listening on port ${PORT}</span></div></div><span class="tag">image: ${IMAGE_TAG}</span></div>
        </section>
      </main>
      <footer><span>Northstar · ECS learning project</span><span>Node.js · Docker · Terraform · AWS</span></footer>
    </div>
  </body>
</html>`);
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "northstar-ecs-demo", imageTag: IMAGE_TAG });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
