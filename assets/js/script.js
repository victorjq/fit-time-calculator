document.addEventListener('DOMContentLoaded', () => {
  // Minimal mobile nav toggle (only if you later add the button)
  const toggle = document.querySelector('.nav-toggle');
  const links  = document.querySelector('.nav-links');
  if (toggle && links) toggle.addEventListener('click', () => links.classList.toggle('open'));

  const form = document.getElementById('fit-form');
  const resultText = document.getElementById('resultText');
  const facts = document.getElementById('facts');
  const goalSel = document.getElementById('goal');
  const presetSel = document.getElementById('preset');

  if (!form || !goalSel || !resultText || !facts) return;

  // Show and hide fields based on goal
  function syncGoalFields() {
    const goal = goalSel.value;
    document.querySelectorAll('[data-goal]').forEach(el => {
      el.classList.toggle('hide', el.getAttribute('data-goal') !== goal);
    });
  }
  goalSel.addEventListener('change', syncGoalFields);
  syncGoalFields();

  // Presets adjust some inputs to sane defaults
  if (presetSel) {
    presetSel.addEventListener('change', () => {
      const w = Number(form.weight.value || 0);
      switch (presetSel.value) {
        case 'power': // Action Hero
          goalSel.value = 'fatloss';
          syncGoalFields();
          form.goalWeight.value = Math.max(w - 6, 55);
          break;
        case 'lean': // Lean Athlete
          goalSel.value = 'fatloss';
          syncGoalFields();
          form.goalWeight.value = Math.max(w - 4, 55);
          break;
        case 'starter': // Starter Recomp
          goalSel.value = 'musclegain';
          syncGoalFields();
          form.gainKg.value = 2;
          break;
        default:
          break;
      }
    });
  }

  // Diet quality factor
  function getDietFactor() {
    const diet = (form.diet && form.diet.value) || 'balanced';
    if (diet === 'poor') return 0.6;       // slower progress
    if (diet === 'lowprotein') return 0.75;
    return 1;                              // balanced
  }

  // Core calculation
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const sex = form.sex.value;
    const age = +form.age.value;
    const height = +form.height.value; // cm
    const weight = +form.weight.value; // kg
    const activity = +form.activity.value;
    const goal = form.goal.value;

    // Basic validation
    if (!sex || !age || !height || !weight || !activity) {
      resultText.textContent = 'Please complete all fields';
      return;
    }

    // BMR Mifflin St Jeor
    const bmr = sex === 'male'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

    const tdee = bmr * activity;
    const dietFactor = getDietFactor();

    let weeksLow = 0;
    let weeksHigh = 0;
    const details = [];

    if (goal === 'fatloss') {
      const goalWeight = Math.max(+form.goalWeight.value || 0, 35);
      const toLose = Math.max(weight - goalWeight, 0.5);

      // Assume 500 kcal daily deficit if user did not provide intake
      const dailyDeficit = 500;
      // 7700 kcal per kg of fat
      const weeklyLossKg = Math.min(Math.max((dailyDeficit * 7) / 7700, 0.23), 0.9); // approx 0.5 to 2 lb
      // Apply diet factor: poorer diet reduces effective weekly progress
      const adjWeeklyLoss = weeklyLossKg * dietFactor;

      // conservative vs aggressive windows
      weeksHigh = Math.ceil(toLose / Math.max(adjWeeklyLoss * 0.6, 0.01));
      weeksLow  = Math.ceil(toLose / Math.max(adjWeeklyLoss, 0.01));

      details.push(`BMR ≈ ${Math.round(bmr)} kcal • TDEE ≈ ${Math.round(tdee)} kcal`);
      details.push(`Assumed deficit ≈ 500 kcal/day`);
      details.push(`Diet quality factor: ${dietFactor}`);
      details.push(`Weekly loss ≈ ${adjWeeklyLoss.toFixed(2)} kg`);
    }

    if (goal === 'musclegain') {
      const gainKg = +form.gainKg.value || 1;
      // Simple weekly rate range
      const perWeekLow = 0.05 * dietFactor;   // conservative
      const perWeekHigh = 0.09 * dietFactor;  // optimistic within reason
      weeksHigh = Math.ceil(gainKg / Math.max(perWeekLow, 0.01));
      weeksLow  = Math.ceil(gainKg / Math.max(perWeekHigh, 0.01));

      details.push(`Diet quality factor: ${dietFactor}`);
      details.push(`Gain rate ≈ ${(perWeekLow).toFixed(2)} to ${(perWeekHigh).toFixed(2)} kg/week`);
    }

    if (goal === 'run5k') {
      const improvePct = +form.improvePct.value || 5;
      // Map 3 to 10 percent to about 8 to 20 weeks, diet factor helps a bit
      const minW = 8;
      const maxW = 20;
      const ratio = Math.min(Math.max(improvePct / 10, 0), 1);
      // Better diet slightly improves training adaptation
      const adaptation = 1 / Math.max(dietFactor, 0.5);
      weeksLow  = Math.round((minW + (maxW - minW) * (ratio * 0.6)) * adaptation);
      weeksHigh = Math.round((minW + (maxW - minW) * ratio) * adaptation);

      details.push(`Diet quality factor: ${dietFactor}`);
      details.push(`Typical block: 8 to 16 weeks for 3–10 percent`);
    }

    // Present result
    const minW = Math.min(weeksLow, weeksHigh);
    const maxW = Math.max(weeksLow, weeksHigh);
    resultText.textContent = (isFinite(minW) && isFinite(maxW) && minW > 0)
      ? `${minW} to ${maxW} weeks`
      : 'Check your inputs';

    // Facts
    facts.innerHTML = '';
    details.forEach(t => {
      const li = document.createElement('li');
      li.textContent = t;
      facts.appendChild(li);
    });

    // Save inputs
    const saved = {};
    new FormData(form).forEach((v, k) => saved[k] = v);
    localStorage.setItem('fit-form', JSON.stringify(saved));
  });

  // Restore previous inputs
  try {
    const saved = JSON.parse(localStorage.getItem('fit-form') || '{}');
    Object.entries(saved).forEach(([k, v]) => {
      if (form[k] != null) form[k].value = v;
    });
    syncGoalFields();
  } catch {}
});
