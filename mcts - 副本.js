

Array.prototype.indexOf = function (val) {
    for (var i = 0; i < this.length; i++) {
        if (this[i] == val) return i;
    }
    return -1;
};

Array.prototype.indexsOf = function (val) {
    var retArr = new Array();
    for (var i = 0; i < this.length; i++) {
        if (this[i] == val) retArr.push(i);
    }
    if (retArr.length > 0) return retArr;
    return -1;
};


Array.prototype.remove = function (val) {
    var index = this.indexOf(val);
    if (index > -1) {
        this.splice(index, 1);
    }
};

class Node {
    constructor(move, parent, state, prior_p) {
        this.move = (typeof move !== 'undefined' ? move : -1);
        this.parentNode = (typeof parent !== 'undefined' ? parent : null);
        this.childNodes = new Array();
        this.wins = 0;
        this.visits = 0;
        this.untriedMoves = state.getNoneMoves();
        this.playerJustMoved = 3 - state.pid;
        this._Q = 0;
        this._u = 0;
        this._P = (typeof prior_p !== 'undefined' ? prior_p : 1.0);
    }

    UCTSelectChild(c_puct) {
        var c = new Array();
        for (var i = 0, len = this.childNodes.length; i < len; i++)
            c[i] = this.childNodes[i].get_value(c_puct, i);
        var idx = c.indexOf(Math.max.apply(null, c));
        //alert(this.move + " : " + this.wins + "/" + this.visits);
        return this.childNodes[idx];
    }

    AddChild(m, s) {
        var n = new Node(m, this, s);
        this.untriedMoves.remove(m);
        this.childNodes.push(n);
        return n;
    }

    Update(result) {
        this.visits += 1;
        //var r = (result == 1 ? 1 : 0);
        this.wins += result;//r;
        this._Q += 1.0 * (result - this._Q) / this.visits;
        //alert("visits:" + this.visits + ", this.wins:" + this.wins + ", result:" + result + ", "
        //    + ", this._Q:" + this._Q + ", ");
    }

    get_value(c_puct, i) {
        //if (i % 20 == 0)
        //    alert("c_puct: " + c_puct + ", P: " + this._P + ", Math.sqrt(this.parentNode.visits):" + Math.sqrt(this.parentNode.visits));
        this._u = (c_puct * this._P * Math.sqrt(this.parentNode.visits) / (1 + this.visits));
        return this._Q + this._u;
    }
}

function UCT(rootstate, chess_board, board_cvs, itermax) {
    var rootnode = new Node(null, null, rootstate, null);
    var node;
    var state;
    var m;
    var is_selected;
    var cur_expand_cnt = 0;

    for (var i = 0; i < itermax; i++) {
        //console.log(i);
        node = rootnode;
        state = _.cloneDeep(rootstate);
        is_selected = false;

        if (i == itermax - 1) debugger
        //if (i % 10 == 0) alert("i: " + i + ",  _Q: " + node._Q);
        //select
        while (node.untriedMoves.length == 0 && node.childNodes.length != 0) {
            node = node.UCTSelectChild(5);
            //setElementText("debug", node);
            state.doMove(node.move, true);
            is_selected = true;
            cur_expand_cnt = 0;
        }

        //expand
        if (node.untriedMoves.length != 0) {
            //m = node.untriedMoves[Math.floor(Math.random() * node.untriedMoves.length)];
            if (is_selected == true || i == 0)
                var best_moves_sorted = state.getMaxScoreMove(state.getNoneMoves(), 2);
            m = best_moves_sorted[cur_expand_cnt];  //按优先落子顺序expand
            cur_expand_cnt++;
            state.doMove(m, true);
            node = node.AddChild(m, state);
        }

        //rollout
        //var best_move = state.getNoneMoves();
        var best_move = state.getMaxScoreMove(state.getNoneMoves(), 0);
        while (best_move != null) {
            state.doMove(best_move, true);
            //state.doMove(best_move[Math.floor(Math.random() * best_move.length)], true);
            var rlt = state.getResult(3 - state.pid);
            if (rlt != 0)
                break;
            best_move = state.getMaxScoreMove(state.getNoneMoves(), 0);
            //best_move = state.getNoneMoves();
            //console.log(best_move);
            //alert(best_move);
        }

        //backpropagate
        //result = state.getResult(3 - rootnode.playerJustMoved)
        while (node != null) {
            node.Update(state.getResult(node.playerJustMoved));
            node = node.parentNode;
        }
        //setElementText("debug", i + "/" + itermax);

    }

    var v = new Array();
    for (i = 0, len = rootnode.childNodes.length; i < len; i++)
        v[i] = rootnode.childNodes[i].visits;
    var ret_node = rootnode.childNodes[v.indexOf(Math.max.apply(null, v))];
    //alert(move);
    _UCTcbk(ret_node, rootstate, chess_board, board_cvs);
}