export default class Battle {
  static teams = [];
  static tacticians = [];
  static state = 0;
  constructor() {}

  static addTeam(name) {
    const uuid = crypto.randomUUID();
    const myTeam = { uuid, name };
    Battle.teams.push(myTeam);
    return myTeam;
  }

  static getTeam(uuid) {
    return Battle.teams.find((team) => team.uuid === uuid);
  }

  static updateTeam() {}

  static deleteTeam(uuid) {
    Battle.teams.splice(
      Battle.teams.findIndex((team) => team.uuid === uuid),
      1
    );
    return Battle.teams;
  }

  static increaState() {
    Battle.state++;
  }

  static getState() {
    return Battle.state;
  }
}
