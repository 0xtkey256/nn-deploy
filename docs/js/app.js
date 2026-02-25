// nn-deploy Documentation - Navigation & Interactivity

document.addEventListener('DOMContentLoaded', () => {
  // --- Scroll Spy ---
  const sections = document.querySelectorAll('.section[id]');
  const navLinks = document.querySelectorAll('.sidebar a[href^="#"]');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navLinks.forEach((a) => a.classList.remove('active'));
          const id = entry.target.id;
          const link = document.querySelector(`.sidebar a[href="#${id}"]`);
          if (link) link.classList.add('active');
        }
      });
    },
    { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
  );

  sections.forEach((s) => observer.observe(s));

  // --- Mobile Menu ---
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.querySelector('.sidebar-backdrop');

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      backdrop.classList.toggle('open');
    });
  }

  if (backdrop) {
    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('open');
      backdrop.classList.remove('open');
    });
  }

  // Close sidebar on nav click (mobile)
  navLinks.forEach((a) => {
    a.addEventListener('click', () => {
      if (window.innerWidth <= 1024) {
        sidebar.classList.remove('open');
        backdrop.classList.remove('open');
      }
    });
  });

  // --- Copy Buttons ---
  document.querySelectorAll('pre').forEach((block) => {
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = 'Copy';
    btn.addEventListener('click', () => {
      const code = block.querySelector('code');
      navigator.clipboard.writeText(code ? code.textContent : block.textContent).then(() => {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 2000);
      });
    });
    block.appendChild(btn);
  });

  // --- Example Tabs ---
  document.querySelectorAll('.example-tabs').forEach((tabBar) => {
    const tabs = tabBar.querySelectorAll('.example-tab');
    const panels = tabBar.parentElement.querySelectorAll('.example-panel');

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        panels.forEach((p) => p.classList.remove('active'));
        tab.classList.add('active');
        const target = document.getElementById(tab.dataset.target);
        if (target) target.classList.add('active');
      });
    });
  });

  // --- Smooth scroll for hash links ---
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth' });
        history.pushState(null, '', `#${id}`);
      }
    });
  });

  // --- Syntax Highlighting (token-based to avoid re-processing spans) ---
  function tokenHighlight(text, rules) {
    // Build a combined regex from all rules
    const parts = [];
    const ruleMap = [];
    for (const [cls, pattern] of rules) {
      const src = pattern.source;
      parts.push(`(${src})`);
      ruleMap.push(cls);
    }
    const combined = new RegExp(parts.join('|'), 'gm');
    let result = '';
    let lastIndex = 0;
    let match;
    while ((match = combined.exec(text)) !== null) {
      // Add unmatched text before this match (escaped)
      if (match.index > lastIndex) {
        result += esc(text.slice(lastIndex, match.index));
      }
      // Find which group matched
      for (let i = 0; i < ruleMap.length; i++) {
        if (match[i + 1] !== undefined) {
          result += `<span class="${ruleMap[i]}">${esc(match[0])}</span>`;
          break;
        }
      }
      lastIndex = combined.lastIndex;
    }
    if (lastIndex < text.length) {
      result += esc(text.slice(lastIndex));
    }
    return result;
  }

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // DSL highlighting
  document.querySelectorAll('code.language-dsl').forEach((block) => {
    block.innerHTML = tokenHighlight(block.textContent, [
      ['token comment', /\/\/.*/],
      ['token dsl-keyword', /\b(?:model|input|output|deploy)\b/],
      ['token dsl-type', /\bTensor\b|\b(?:float32|float16|int32|int8|uint8|bool)\b/],
      ['token dsl-op', /\b(?:MatMul|Conv2D|DepthwiseConv2D|ConvTranspose2D|Add|Sub|Mul|Div|ReLU|GELU|Sigmoid|Tanh|Softmax|SiLU|BatchNorm|LayerNorm|GroupNorm|InstanceNorm|MaxPool2D|AvgPool2D|GlobalAvgPool|AdaptiveAvgPool|Reshape|Transpose|Flatten|Concat|Split|Squeeze|Unsqueeze|ReduceSum|ReduceMean|ReduceMax|Embedding|ScaledDotProductAttention|FusedConvBNReLU|FusedConvBN|FusedMatMulAdd|FusedLinearReLU)\b/],
      ['token string', /"[^"]*"|'[^']*'/],
      ['token number', /\b\d+\b/],
      ['token property', /\w+(?==)/],
    ]);
  });

  // TypeScript highlighting
  document.querySelectorAll('code.language-typescript, code.language-ts').forEach((block) => {
    block.innerHTML = tokenHighlight(block.textContent, [
      ['token comment', /\/\/.*/],
      ['token string', /'[^']*'|`[^`]*`|"[^"]*"/],
      ['token keyword', /\b(?:import|export|from|const|let|var|function|async|await|class|new|return|if|else|for|while|type|interface|extends|implements|static|readonly|void|null|undefined|true|false|typeof|instanceof)\b/],
      ['token type', /\b(?:string|number|boolean|Record|Promise|Tensor|InferenceSession|Graph|CompiledModel|CompileOptions|CompileResult|GeneratedCode|GraphMetrics|SessionOptions|ModelMetadata)\b/],
      ['token number', /\b\d+\.?\d*\b/],
      ['token function', /\b\w+(?=\s*\()/],
    ]);
  });

  // WGSL highlighting
  document.querySelectorAll('code.language-wgsl').forEach((block) => {
    block.innerHTML = tokenHighlight(block.textContent, [
      ['token comment', /\/\/.*/],
      ['token keyword', /@\w+|\b(?:fn|var|let|return|for|if|else|struct)\b/],
      ['token type', /\b(?:f32|u32|i32|vec3|vec4|mat4x4|array|ptr|storage|read_write|workgroup|uniform|read)\b/],
      ['token number', /\b\d+\.?\d*[fu]?\b/],
      ['token function', /\b\w+(?=\s*\()/],
    ]);
  });

  // Bash highlighting
  document.querySelectorAll('code.language-bash, code.language-shell').forEach((block) => {
    block.innerHTML = tokenHighlight(block.textContent, [
      ['token comment', /#.*/],
      ['token string', /"[^"]*"|'[^']*'/],
      ['token function', /\b(?:git|npm|npx|cd|mkdir|clone|install|run|dev|build)\b/],
      ['token property', /--?\w[\w-]*/],
    ]);
  });

  // JSON highlighting
  document.querySelectorAll('code.language-json').forEach((block) => {
    block.innerHTML = tokenHighlight(block.textContent, [
      ['token property', /"(?:[^"\\]|\\.)*"(?=\s*:)/],
      ['token string', /"(?:[^"\\]|\\.)*"/],
      ['token keyword', /\b(?:true|false|null)\b/],
      ['token number', /\b\d+\.?\d*\b/],
    ]);
  });

  // --- Hash scroll on load ---
  if (location.hash) {
    const el = document.getElementById(location.hash.slice(1));
    if (el) setTimeout(() => el.scrollIntoView(), 100);
  }
});
