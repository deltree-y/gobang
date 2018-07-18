

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
        this.try_cnt = 0;
        this.untriedMoves = state.getNoneMoves();
        this.max_move_cnt = this.untriedMoves.length;
        this.playerJustMoved = 3 - state.pid;
        this._Q = 0;
        this._u = 0;
        this._P = 1.0;//(typeof prior_p !== 'undefined' ? prior_p : 1.0);
    }

    UCTSelectChild(c_puct) {
        var c = new Array();
        for (var i = 0, len = this.childNodes.length; i < len; i++)
            c[i] = this.childNodes[i].get_value(c_puct, i);
        var idx = c.indexOf(Math.max.apply(null, c));
        return this.childNodes[idx];
    }

    AddChild(m, s) {
        var n = new Node(m, this, s);
        if (this.untriedMoves.length == 1) {
            this.untriedMoves = [];
            console.log("AddChild() - not enough moves.");
        } else {
            this.untriedMoves.remove(m);
            //console.log("untriedMoves.length in addchild:" + this.untriedMoves.length);
            //console.log("remove:" + m);
            //console.log("untriedMoves in addchild:" + this.untriedMoves);
        }
        this.childNodes.push(n);
        return n;
    }

    Update(result) {
        this.visits += 1;
        this.wins += result;//r;
        //this._Q += 1.0 * (result - this._Q) / this.visits;
    }

    get_value(c_puct, i) {
        //this._u = (c_puct * this._P * Math.sqrt(this.parentNode.visits) / (1 + this.visits));
        //return this._Q + this._u;
        //Python : c.wins / c.visits + sqrt(2 * log(self.visits) / c.visits))
        return (this.wins / this.visits) + Math.sqrt(2 * Math.log(this.parentNode.visits) / this.visits);
    }
}

function UCT(rootstate, chess_board, board_cvs, itermax) {
    var rootnode = new Node(null, null, rootstate, null);
    var node;
    var state;
    var m;
    var cur_expand_cnt = 1;
    //var try_cnt = 0;
    console.log("");
    console.log("new round begin!!!!!!!!!!!!!!!!!");
    for (var i = 0; i < itermax; i++) {
        node = rootnode;
        state = _.cloneDeep(rootstate);
        is_selected = false;

        //select
        console.log("start   select");
        //while (node.untriedMoves.length == 0 && node.childNodes.length != 0) {
        //while (node.untriedMoves.length <= try_cnt && node.childNodes.length != 0) {
        while (node.try_cnt > 5 && node.childNodes.length != 0) {
            node = node.UCTSelectChild(1);
            state.doMove(node.move, true);
            console.log("select child:" + state.move2pos(node.move).row + "," + state.move2pos(node.move).col);
        }

        //expand
        console.log("start   expand");
        if (node.untriedMoves.length != 0) {
            //if (node.untriedMoves.length <= state.full_cnt) {
            //m = node.untriedMoves[Math.floor(Math.random() * node.untriedMoves.length)];
            var best_moves_sorted = state.getMaxScoreMove(state.getNoneMoves(), 2);
            if (best_moves_sorted != null) {
                none_moves = state.getNoneMoves();
                for (idx = 0, len = best_moves_sorted.length; idx < len; idx++)
                    if (none_moves.indexOf(best_moves_sorted[idx]) != -1) {
                        if (idx >= node.try_cnt) {
                            m = best_moves_sorted[idx];
                            break;
                        }
                        else {
                            continue;
                        }
                    }
                //if (is_selected == true || i == 0)
                //    var best_moves_sorted = state.getMaxScoreMove(state.getNoneMoves(), 2);
                //m = best_moves_sorted[cur_expand_cnt];  //按优先落子顺序expand  TODO:这里可能有问题，可能expand到对方已经走过的位置
                //cur_expand_cnt++;
                state.doMove(m, true);
                node.try_cnt++;
                node = node.AddChild(m, state);
                var side = (3 - state.pid == 1) ? 'black' : 'white';
                console.log("side:" + side + ", expand(" + cur_expand_cnt + "):" + state.move2pos(m).row + "," + state.move2pos(m).col);
                cur_expand_cnt++;
            }
        }
        //expand 后要立刻判断一次胜负
        if (state.getResult(3 - state.pid) == 0) { //如果未分胜负才进行rollout
            console.log("start   rollout");
            //rollout
            //var best_move = state.getNoneMoves();
            var side;
            var rollout_cnt = 0;
            var best_move = state.getMaxScoreMove(state.getNoneMoves(), 0);
            while (best_move != null) {
                rollout_cnt++;
                if (rollout_cnt > 100) debugger;
                state.doMove(best_move.idx, true);
                side = (3 - state.pid == 1) ? 'black' : 'white';
                //console.log("rollout - side:" + side + ", move:" + state.move2pos(best_move.idx).row + "," + state.move2pos(best_move.idx).col);

                //state.doMove(best_move[Math.floor(Math.random() * best_move.length)], true);
                var rlt = state.getResult(3 - state.pid);
                if (rlt != 0) {
                    side = (3 - state.pid == 1) ? 'black' : 'white';
                    console.log("rollout round end - side:" + side + ", result:" + rlt);
                    break;
                }
                var none_moves = state.getNoneMoves();
                best_move = state.getMaxScoreMove(none_moves, 0);
                //console.log(best_move);
            }
        }

        //backpropagate
        console.log("start   backpropagate");
        //result = state.getResult(3 - rootnode.playerJustMoved)
        while (node != null) {
            var side = (node.playerJustMoved == 1) ? 'black' : 'white';
            var rlt = state.getResult(node.playerJustMoved);
            console.log("update node:" + state.move2pos(node.move).row + "," + state.move2pos(node.move).col + ", side:" + side + ", result:" + rlt);
            node.Update(rlt);
            node = node.parentNode;
        }

    }

    var v = new Array();
    for (i = 0, len = rootnode.childNodes.length; i < len; i++)
        v[i] = rootnode.childNodes[i].visits;
    var ret_node = rootnode.childNodes[v.indexOf(Math.max.apply(null, v))];
    //alert(move);
    _UCTcbk(ret_node, rootstate, chess_board, board_cvs);
}