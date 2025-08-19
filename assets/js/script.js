document.addEventListener('DOMContentLoaded', () => {
  // Mobile nav minimal toggle
  const toggle = document.querySelector('.nav-toggle');
  const links  = document.querySelector('.nav-links');
  if (toggle) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
  }

  const form = document.getElementById('fit-form');
  const resultText = document.getElementById('resultText');
  const facts = document.getElementById('facts');
  const goalSel = document.getElementById('goal');
  const presetSel = document.getElementById('preset');

  // Show goal-specific inputs without media queries or extra JS libs
  function syncGoalFields() {
    document.querySelectorAll('[data-goal]').forEach(el => {
      el.classList.toggle('hide', el.getAttribute('data-goal') !== goalSel.value);
    });
  }
  goalSel.addEventListener('change', syncGoalFields);
  syncGoalFields();

  // Preset mapping tweaks defaults to keep the UI friendly
  presetSel.addEventListener('change', () => {
    const weight = form.weight;
    const goalWeight = form.goalWeight;
    const gainKg = form.gainKg;

    switch (presetSel.value) {
      case 'power': // Action Hero
        goalSel.value = 'fatloss';
        syncGoalFields();
        goalWeight.value = Math.max(Number(weight.value) - 6, 55);
        break;
      case 'lean': // Lean Athlete
        goalSel.value = 'fatloss';
        syncGoalFields();
        goalWeight.value = Math.max(Number(weight.value) - 4, 55);
        break;
      case 'starter': // Starter Recomp
        goalSel.value = 'musclegain';
        syncGoalFields();
        gainKg.value = 2;
        break;
      default:
        break;
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const sex = form.sex.value;
    const age = +form.age.value;
    const height = +form.height.value; // cm
    const weight = +form.weight.value; // kg
    const activity = +form.activity.value;
    const goal = form.goal.value;

    // BMR Mifflin St Jeor
    const bmr = sex === 'male'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

    const tdee = bmr * activity;

    let weeksLow = 0, weeksHigh = 0;
    const details = [];

    if (goal === 'fatloss') {
      const goalWeight = Math.max(+form.goalWeight.value, 35);
      const toLose = Math.max(weight - goalWeight, 0.5);

      // Default deficit if user didnt set intake: ~500 kcal/day
      const dailyDeficit = 500;
      const weeklyLossKg = Math.min(Math.max((dailyDeficit * 7) / 7700, 0.23), 0.9); // 0.5 to 2 lb
      weeksHigh = Math.ceil(toLose / (weeklyLossKg * 0.6)); // conservative
      weeksLow  = Math.ceil(toLose / weeklyLossKg);         // aggressive cap
      details.push(`BMR ≈ ${Math.round(bmr)} kcal, TDEE ≈ ${Math.round(tdee)} kcal`);
      details.push(`Assumed deficit ≈ 500 kcal/day`);
      details.push(`Estimated weekly loss ≈ ${(weeklyLossKg).toFixed(2)} kg`);
    }

    if (goal === 'musclegain') {
      const gainKg = +form.gainKg.value;
      // Simple weekly rate: novice 0.3–0.5 kg/mo, intermediate 0.2–0.3
      const perWeekLow = 0.05;  // conservative
      const perWeekHigh = 0.09; // optimistic but sane
      weeksHigh = Math.ceil(gainKg / perWeekLow);
      weeksLow  = Math.ceil(gainKg / perWeekHigh);
      details.push(`Gain rate ≈ ${perWeekLow.toFixed(2)} to ${perWeekHigh.toFixed(2)} kg/week`);
    }

    if (goal === 'run5k') {
      const improvePct = +form.improvePct.value; // 3 to 10 percent typical
      const minW = 8, maxW = 20;
      const ratio = Math.min(Math.max(improvePct / 10, 0), 1);
      weeksLow  = Math.round(minW + (maxW - minW) * (ratio * 0.6)); // optimistic
      weeksHigh = Math.round(minW + (maxW - minW) * ratio);         // conservative
      details.push(`Typical 5k block: 8 to 16 weeks for 3–10 percent`);
    }

    // Present result
    const minW = Math.min(weeksLow, weeksHigh);
    const maxW = Math.max(weeksLow, weeksHigh);
    resultText.textContent = isFinite(minW) && isFinite(maxW)
      ? `${minW} to ${maxW} weeks`
      : `Check your inputs`;

    // Facts list
    facts.innerHTML = '';
    details.forEach(t => {
      const li = document.createElement('li');
      li.textContent = t;
      facts.appendChild(li);
    });

    // Save last inputs for convenience
    const saved = {};
    new FormData(form).forEach((v, k) => saved[k] = v);
    localStorage.setItem('fit-form', JSON.stringify(saved));
  });

  // Restore inputs if present
  try {
    const saved = JSON.parse(localStorage.getItem('fit-form') || '{}');
    Object.entries(saved).forEach(([k, v]) => {
      if (form[k]) form[k].value = v;
    });
    syncGoalFields();
  } catch {}
});
