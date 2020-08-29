
class Action {
  constructor(name, action, init=null, clearup=null) {
    this.name = name;
    this.action = action;
    this.init = init || (() => {});
    this.clearup = clearup || (() => {});
  }
}

Action.THIEVING = 'theiving';

class XGame {
  constructor() {
    if (window.this) return;
    window.xg = this;
    this.on = true;
    this.autoEat = true;
    this.autoLoot = true;

    this.oDropLoot = window.dropLoot;
    window.dropLoot = e => this.dropLoot(e);

    this.oAtkEnm = window.attackEnemy;
    window.attackEnemy = (...args) => this.attackEnemy(...args);

    this.oStunNotify = window.stunNotify;
    window.stunNotify = (...args) => this.stunNotify(...args);

    this.oUMR = window.updateMiningRates;
    window.updateMiningRates = (...args) => this.updateMiningRates(...args);

    // this.oSFS = window.startFishing;
    // window.startFishing = (...args) => this.startFishing(...args);

    this.oUFAW = window.updateFishingAreaWeights;
    window.updateFishingAreaWeights = (...args) => this.ufaw(...args);
  }

  ufaw(...args) {
    if (!this.aa()) {
      this.oUFAW(...args);
    }
  }

  toggle() {
    this.on = !this.on;
  }

  escapeAct() {
    mineRock(0, false, true);
  }

  escape() {
    this.escapeAct();
  }

  dropLoot(...args) {
    this.oDropLoot(...args);
    if (this.on && this.autoLoot) {
      lootAll();
    }
  }

  eatCheck() {
    return items[equippedFood[currentCombatFood].itemID].healsFor * numberMultiplier + combatData.player.hitpoints <= maxHitpoints;
  }

  hasFood() {
    return items[equippedFood[currentCombatFood].itemID].healsFor>0 && equippedFood[currentCombatFood].qty>0;
  }
  
  attackEnemy(...args) {
    this.oAtkEnm(...args);
    if (this.on && this.autoEat) {
      while (this.hasFood() && this.eatCheck()) {
        eatFood();
      }
    }
  }

  stopCurrent() {
    if (this.autoAction instanceof Action) {
      this.notify(`stop current action ${this.autoAction.name}`);
      this.autoAction.clearup();
      this.autoAction = null;  
    }
  }

  checkAA(action) {
    return this.autoAction instanceof Action && this.autoAction.name == action;
  }

  aa() {
    return this.on && (this.autoAction instanceof Action) && this.autoAction.action();
  }

  stunNotify(...args) {
    this.oStunNotify(...args);
    this.stunNotifyAction && this.stunNotifyAction();
  }

  updateMiningRates() {
    this.oUMR();
    this.aa();
  }

  autoThieving(npc, autoeat) {
    this.stopCurrent();
    this.autoAction = new Action(Action.THIEVING,
      () => this.tryStartThieving(),
      () => this.thievingInit(),
      () => this.thievingClearup()
      );
    this.autoAction.eat=autoeat;
    this.autoThievingNpc=npc;
    this.notify(`start auto thieving`);
    this.autoAction.init();
    this.aa();
  }

  thievingInit() {
    this.stunNotifyAction = () => {
      if (!this.on) return;
      if (currentGamemode==1 || this.autoAction.eat) {
        while (this.hasFood() && this.eatCheck()) {
          eatFood();
        }  
      }
      if (!this.tryThievingFishing()) {
        mineRock(10, false, true);
      }
    };
  }

  thievingClearup() {
    this.stunNotifyAction = null;
  }

  tryThievingFishing() {
    const f = [
      [5,1],  // whale
      [6,2],  // leaping board fish
      [7,1],  // skeleton
      [2,0],  // blowfish
    ];
    for (let e of f) {
      let itemID = fishingItems[fishingAreas[e[0]].fish[e[1]]].itemID;
      if (skillLevel[CONSTANTS.skill.Fishing] < items[itemID].fishingLevel) continue;
      startFishing(...e, false);
      return true;
    }
    return false;
  }

  tryStartThieving() {
    if (isStunned) return false;
    let npc=this.autoThievingNpc;
    let hp = combatData.player.hitpoints;
    if (hp < 50) {
      this.notify('low hp, quit auto thieving');
      this.stopCurrent();
      return false;
    }
    if (skillLevel[CONSTANTS.skill.Thieving] < thievingNPC[npc].level) {
      this.notify(`skill level not enough to thieving ${thievingNPC[npc].name}, quit auto thieving`);
      this.stopCurrent();
      return false;
    }
    if (!this.hasFood()) {
      this.notify('you have no food, quit auto thieving');
      this.stopCurrent();
      return false;
    }
    window.setTimeout(() => pickpocket(npc, false),0);
    return true;
  }

  sellAll(itemID) {
    let bankID = getBankId(itemID);
    if (bankID !== false) {
      processItemSale(itemID, bank[bankID].qty);
    }
  }

  sag() {
    const gems = ['Topaz', 'Sapphire', 'Ruby', 'Emerald'];
    for (const g of gems) {
      this.sellAll(CONSTANTS.item[g]);
    }
  }

  saj() {
    for (const j of junkItems) {
      this.sellAll(j);
    }
  }

  notify(message, type='danger') {
    One.helpers('notify', {type:type , from:'bottom', align:'center', message:message});
  }
}