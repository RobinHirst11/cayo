const htmlElements = {
  gold: document.querySelector('#gold'),
  weed: document.querySelector('#weed'),
  cash: document.querySelector('#cash'),
  cocaine: document.querySelector('#cocaine'),
  paintings: document.querySelector('#paintings'),
  amountOfPlayers: document.querySelector('#amountOfPlayers'),
  leaderCut: document.querySelector('#leaderCut'),
  member1Cut: document.querySelector('#member1Cut'),
  member2Cut: document.querySelector('#member2Cut'),
  member3Cut: document.querySelector('#member3Cut'),
};
Object.entries(htmlElements).forEach(([setting, elementHTML]) => {
  elementHTML.value = JSON.parse(Settings[setting]);
});
document.querySelector('#isHardMode').value = Settings.isHardMode;
document.querySelector('#isWithinCooldown').value = Settings.isWithinCooldown;
document.querySelector('#goldAlone').value = Settings.goldAlone;
document.querySelector('#primaryTarget').value = Settings.primaryTarget;
let bags = {};

const Counter = {
  targetsData: {},
  secondaryTargetsOrder: [],

  init: function() {
    return Loader.promises['targets'].execute(data => {
      Counter.targetsData = data;
      Counter.targetsData.targets.secondary.forEach(({ name, value, weight }) => {
        const profit = getAverage(value.min, value.max) / weight;
        Counter.secondaryTargetsOrder.push({ name, bagProfit: profit });
      });
      Counter.getLoot();
    });
  },
  getLoot: function() {
    const amounts = [];
    let bagsFill = 0;
    let emptySpace = Settings.amountOfPlayers;
    let totalValue = 0;
    const isHardMode = Settings.isHardMode ? 'hard' : 'standard';
    const withinCooldownSecondaryBonus = Settings.isWithinCooldown ?
      Counter.targetsData.targets.primary.find(({ name }) => name === Settings.primaryTarget).bonus_multiplier : 1;
    const players = Settings.amountOfPlayers;

    Counter.secondaryTargetsOrder.forEach(element => {
      if (emptySpace < 0.1) return;
      emptySpace = players - bagsFill;
      const obj = Counter.targetsData.targets.secondary.find(object => object.name === element.name);
      if (!Settings.goldAlone && +players === 1 && obj.name === 'gold') return;
      if (obj.name === 'paintings' && emptySpace < 0.5) return;
      const maxFill = (() => {
        let tempAmount = Settings[obj.name];
        if (obj.name === 'paintings') {
          while (tempAmount * obj.weight > emptySpace) {
            tempAmount--;
          }
        }
        return tempAmount * obj.weight;
      })();
      let realFill = maxFill >= players ? players : maxFill;
      bagsFill += +realFill;
      realFill = realFill > emptySpace ? emptySpace : realFill;
      if (realFill < 0.1) return;
      const clicks = (() => {
        const rest = Number((realFill / obj.weight - Math.floor(realFill / obj.weight)).toFixed(3));
        let value = Math.floor(realFill / obj.weight) * obj.pickup_steps.length + findClosestValue(rest % 1 * 100, obj.pickup_steps);
        if (value % 10 !== 0 && (['cocaine', 'cash'].includes(obj.name) || ['weed'].includes(obj.name) && players > 1)) {
          value += 1;
        }
        return obj.name === 'paintings' ? `${value * 4} cuts` : `${value} clicks`;
      })();

      amounts.push({ name: obj.name, amount: realFill, clicks: clicks });
      totalValue += realFill * (getAverage(obj.value.min, obj.value.max) * withinCooldownSecondaryBonus / obj.weight);
    });
    const finalValue = totalValue + Counter.targetsData.targets.primary.find(({ name }) =>
      name === Settings.primaryTarget).value[isHardMode];

    Counter.updateWebsite(amounts, finalValue, withinCooldownSecondaryBonus);
  },
  updateWebsite: function(amounts, totalValue, withinCooldownSecondaryBonus) {
    totalValue *= Counter.targetsData.events_multiplier;
    const officeSafe = Counter.targetsData.targets.office_safe;
    const averageOfficeSafe = getAverage(officeSafe.min, officeSafe.max);
    const fencingFee = totalValue * 0.1;
    const pavelFee = totalValue * 0.02;
    const eliteChallenge = Counter.targetsData.elite_challenge[Settings.isHardMode ? 'hard' : 'standard'];
    document.querySelector('#office-safe').innerText = `~ $${Math.round(averageOfficeSafe).toLocaleString()}`;
    document.querySelector('#fencing-fee').innerText = Math.round(fencingFee).toLocaleString();
    document.querySelector('#pavel-fee').innerText = Math.round(pavelFee).toLocaleString();
    document.querySelector('#elite-challenge').innerText = Math.round(eliteChallenge).toLocaleString();
    const finalValue = totalValue + averageOfficeSafe - fencingFee - pavelFee;
    document.querySelector('#max-loot-value').innerText = Math.round(finalValue).toLocaleString();

    document.querySelectorAll('.big').forEach(e => {
      e.parentElement.classList.add('hidden');
    });

    Counter.targetsData.targets.secondary.forEach(({ name, value: { min, max } }) => {
      document.querySelector(`#${name}-stacks-value`).innerText = '$' + Math.round((min + max) * withinCooldownSecondaryBonus / 2).toLocaleString();
    });
    Counter.targetsData.targets.secondary.forEach(({ name, weight, value: { min, max } }) => {
      const avg = (min + max) * withinCooldownSecondaryBonus / 2;
      document.querySelector(`#${name}-bags-value`).innerText = '$' + Math.round(avg / weight).toLocaleString();
    });
    Counter.targetsData.targets.secondary.forEach(({ name, bag_capacity_steps: bagCapacity }) => {
      document.querySelector(`#${name}-bag-percent`).innerText = rounding([...bagCapacity].pop()) + '%';
    });

    const inputs = document.querySelectorAll('.cuts input');
    [...inputs].forEach(element => {
      element.nextElementSibling.innerText = Math.round(finalValue * Settings[element.id] / 100).toLocaleString();
    });

    bags = {
      profit: Math.round(finalValue),
    };
    amounts.forEach(object => {
      const amount = rounding(Number(object.amount));
      const element = document.querySelector(`#${object.name}-bag`);
      if (amount !== 0) {
        element.innerHTML = `${amount} <span>${object.name} bag${amount > 1 ? 's' : ''} - ${object.clicks}</span>`;
        element.parentElement.classList.remove('hidden');
      }
      bags[object.name] = [Number(amount), Number(object.clicks.replace(/clicks|cuts/g, '')), Number(htmlElements[object.name].value)];
    });

    document.querySelector('#bags_fill').innerText = amounts.reduce((acc, obj) => acc + +rounding(+obj.amount), 0).toFixed(2);
  },
  activateHandlers: function() {
    document.querySelector('#isHardMode').addEventListener('change', () => {
      Settings.isHardMode = JSON.parse(isHardMode.value); // boolean
    });

    document.querySelector('#isWithinCooldown').addEventListener('change', () => {
      Settings.isWithinCooldown = JSON.parse(isWithinCooldown.value); // boolean
    });

    document.querySelector('#goldAlone').addEventListener('change', () => {
      Settings.goldAlone = JSON.parse(goldAlone.value); // boolean
    });

    document.querySelector('#primaryTarget').addEventListener('change', () => {
      Settings.primaryTarget = primaryTarget.value; // string
    });
    Object.values(htmlElements).forEach(element => {
      element.addEventListener('change', event => {
        Settings[event.currentTarget.id] = +event.target.value;
      });
    });

    document.querySelector('#link-settings').addEventListener('click', () => {
      if (window.event.ctrlKey) {
        const json = JSON.stringify({
          hard: Settings.isHardMode,
          withinCooldown: Settings.isWithinCooldown,
          target: Settings.primaryTarget,
          players: Settings.amountOfPlayers,
          ...bags,
        });
        setClipboardText(`$loot ${json}`);
        return;
      }

      setClipboardText(SearchQuery.getUrl());
      alert('Link has been copied to clipboard!');
    });

    document.querySelector('#reset-settings').addEventListener('click', () => {
      document.querySelector('#primaryTarget').value = 'tequila';
      Settings.primaryTarget = 'tequila';
      ['gold', 'weed', 'cash', 'cocaine', 'paintings'].forEach(target => {
        Settings[target] = 0;
        htmlElements[target].value = 0;
      });
    });

    SettingProxy.addListener(Settings, 'gold weed cash cocaine paintings primaryTarget isHardMode isWithinCooldown goldAlone leaderCut member1Cut member2Cut member3Cut', Counter.getLoot);
    SettingProxy.addListener(Settings, 'amountOfPlayers', () => {
      document.querySelector('#goldAlone').parentElement.classList.toggle('hidden', Settings.amountOfPlayers !== 1);
      const inputs = document.querySelectorAll('.cuts input');
      [...inputs].forEach((element, index) => {
        element.parentElement.classList.toggle('hidden', Settings.amountOfPlayers <= index);
      });
      Counter.getLoot();
    })();
  },
};

const findError = callback => (...args) => callback(args).catch(console.log);

document.addEventListener('DOMContentLoaded', () => {
  try {
    Counter.init()
      .then(Counter.activateHandlers)
      .then(Loader.resolveContentLoaded);
  } catch (error) {
    console.log(error);
    alert(error);
  }
});

function rounding(value) {
  return (Math.round(value * 20) * 0.05).toFixed(2);
}

function getAverage(...args) {
  return args.reduce((acc, val) => acc + val, 0) / args.length;
}

function findClosestValue(value, array) {
  if (value === 0) return 0;
  return array
    .map(element => Math.abs(value - element))
    .reduce((acc, el, index, arr) => el < arr[acc] ? index : acc, 0) + 1;
}
