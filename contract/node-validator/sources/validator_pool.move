/// Node Validator Pool - Realistic validator lifecycle and reward distribution
/// 
/// This module implements a validator staking pool where:
/// - Users pool IOTA tokens to reach validator stake threshold
/// - Validator becomes active after required stake is met
/// - Rewards are distributed with configurable operator cut
/// - Pool follows realistic validator lifecycle states
/// 
/// Pool States: COLLECTING → READY → ACTIVE
/// Reward Model: Operator cut + proportional user rewards
#[allow(duplicate_alias)]
module node_validator::validator_pool {
    use iota::coin::{Self, Coin};
    use iota::iota::IOTA;
    use iota::balance::{Self, Balance};
    use iota::object::{UID, ID};
    use iota::transfer;
    use iota::tx_context::TxContext;
    use iota::event;

    // === Pool States ===
    const COLLECTING: u8 = 0; // Pool accepting stakes
    const READY: u8 = 1;      // Threshold met, ready for activation
    const ACTIVE: u8 = 2;     // Validator running, earning rewards

    // === Error codes ===
    
    /// Unauthorized access attempt
    const E_UNAUTHORIZED: u64 = 1001;
    /// Invalid pool state for operation
    const E_INVALID_STATE: u64 = 1002;
    /// Insufficient stake amount
    const E_INSUFFICIENT_STAKE: u64 = 1003;
    /// Zero amount not allowed
    const E_ZERO_AMOUNT: u64 = 1004;

    /// Withdrawal not allowed in current state
    const E_WITHDRAWAL_NOT_ALLOWED: u64 = 1007;

    // === Structs ===

    /// Validator staking pool with lifecycle management and reward distribution
    public struct ValidatorPool has key, store {
        id: UID,
        /// Required stake to activate validator (default: 1000 IOTA)
        required_stake: u64,
        /// Current total stake in pool
        total_stake: u64,
        /// Pool operator (validator runner)
        operator: address,
        /// Operator reward percentage (0-100, default: 10)
        operator_reward_pct: u8,
        /// Current pool status (COLLECTING/READY/ACTIVE)
        status: u8,
        /// Accumulated rewards waiting for distribution
        accumulated_reward: u64,
        /// Total rewards distributed per stake unit (for reward calculation)
        reward_per_stake: u64,
        /// Pool balance
        balance: Balance<IOTA>,
    }

    /// Individual contributor's stake and reward tracking
    public struct Contributor has key, store {
        id: UID,
        /// Pool this contribution belongs to
        pool_id: ID,
        /// Contributor address
        owner: address,
        /// Amount staked by contributor
        staked_amount: u64,
        /// Reward debt (for preventing double claims)
        reward_debt: u64,
    }

    /// Operator capability for pool management
    public struct OperatorCap has key, store {
        id: UID,
        /// Pool ID this capability controls
        pool_id: ID,
    }

    // === Events ===

    /// Pool creation event
    public struct PoolCreated has copy, drop {
        pool_id: ID,
        operator: address,
        required_stake: u64,
        operator_reward_pct: u8,
    }

    /// Stake deposit event
    public struct StakeDeposited has copy, drop {
        pool_id: ID,
        contributor: address,
        amount: u64,
        new_total_stake: u64,
        pool_status: u8,
    }

    /// Pool activation event
    public struct PoolActivated has copy, drop {
        pool_id: ID,
        operator: address,
        total_stake: u64,
    }

    /// Reward recorded event
    public struct RewardRecorded has copy, drop {
        pool_id: ID,
        reward_amount: u64,
        new_accumulated_reward: u64,
    }

    /// Reward claimed event
    public struct RewardClaimed has copy, drop {
        pool_id: ID,
        claimer: address,
        reward_amount: u64,
        is_operator: bool,
    }

    /// Stake withdrawn event
    public struct StakeWithdrawn has copy, drop {
        pool_id: ID,
        contributor: address,
        amount: u64,
        new_total_stake: u64,
    }

    // === Public Functions ===

    /// Create a new validator pool with configurable parameters
    /// Returns the pool object and operator capability
    public fun create_pool(
        required_stake: u64,
        operator_reward_pct: u8,
        ctx: &mut TxContext
    ): (ValidatorPool, OperatorCap) {
        assert!(operator_reward_pct <= 100, E_ZERO_AMOUNT);
        assert!(required_stake > 0, E_ZERO_AMOUNT);

        let pool_id = object::new(ctx);
        let pool_id_copy = object::uid_to_inner(&pool_id);
        let operator = tx_context::sender(ctx);
        
        let pool = ValidatorPool {
            id: pool_id,
            required_stake,
            total_stake: 0,
            operator,
            operator_reward_pct,
            status: COLLECTING,
            accumulated_reward: 0,
            reward_per_stake: 0,
            balance: balance::zero<IOTA>(),
        };

        let operator_cap = OperatorCap {
            id: object::new(ctx),
            pool_id: pool_id_copy,
        };

        event::emit(PoolCreated {
            pool_id: pool_id_copy,
            operator,
            required_stake,
            operator_reward_pct,
        });

        (pool, operator_cap)
    }

    /// Stake IOTA into the pool (only allowed in COLLECTING or READY state)
    public fun stake(
        pool: &mut ValidatorPool,
        stake_coin: Coin<IOTA>,
        ctx: &mut TxContext
    ): Contributor {
        assert!(pool.status == COLLECTING || pool.status == READY, E_INVALID_STATE);
        
        let stake_amount = coin::value(&stake_coin);
        assert!(stake_amount > 0, E_ZERO_AMOUNT);
        
        let contributor_addr = tx_context::sender(ctx);
        
        // Add funds to pool
        let stake_balance = coin::into_balance(stake_coin);
        balance::join(&mut pool.balance, stake_balance);
        
        // Update total stake
        pool.total_stake = pool.total_stake + stake_amount;
        
        // Check if threshold reached and update status
        if (pool.total_stake >= pool.required_stake && pool.status == COLLECTING) {
            pool.status = READY;
        };

        let contributor = Contributor {
            id: object::new(ctx),
            pool_id: object::uid_to_inner(&pool.id),
            owner: contributor_addr,
            staked_amount: stake_amount,
            reward_debt: pool.reward_per_stake * stake_amount / 1000000, // Scale for precision
        };

        event::emit(StakeDeposited {
            pool_id: object::uid_to_inner(&pool.id),
            contributor: contributor_addr,
            amount: stake_amount,
            new_total_stake: pool.total_stake,
            pool_status: pool.status,
        });

        contributor
    }

    /// Activate pool (operator only, when status is READY)
    public fun activate_pool(
        pool: &mut ValidatorPool,
        _operator_cap: &OperatorCap,
        ctx: &TxContext
    ) {
        assert!(pool.status == READY, E_INVALID_STATE);
        assert!(tx_context::sender(ctx) == pool.operator, E_UNAUTHORIZED);
        
        pool.status = ACTIVE;

        event::emit(PoolActivated {
            pool_id: object::uid_to_inner(&pool.id),
            operator: pool.operator,
            total_stake: pool.total_stake,
        });
    }

    /// Record validator rewards (can be called by anyone when pool is ACTIVE)
    public fun record_reward(
        pool: &mut ValidatorPool,
        reward_coin: Coin<IOTA>,
    ) {
        assert!(pool.status == ACTIVE, E_INVALID_STATE);
        
        let reward_amount = coin::value(&reward_coin);
        assert!(reward_amount > 0, E_ZERO_AMOUNT);
        
        // Add reward to pool balance
        let reward_balance = coin::into_balance(reward_coin);
        balance::join(&mut pool.balance, reward_balance);
        
        // Update accumulated rewards
        pool.accumulated_reward = pool.accumulated_reward + reward_amount;
        
        // Update reward per stake for future reward calculations
        if (pool.total_stake > 0) {
            pool.reward_per_stake = pool.reward_per_stake + (reward_amount * 1000000) / pool.total_stake;
        };

        event::emit(RewardRecorded {
            pool_id: object::uid_to_inner(&pool.id),
            reward_amount,
            new_accumulated_reward: pool.accumulated_reward,
        });
    }

    /// Claim user rewards (proportional to stake)
    public fun claim_reward(
        pool: &mut ValidatorPool,
        contributor: &mut Contributor,
        ctx: &mut TxContext
    ): Coin<IOTA> {
        assert!(pool.status == ACTIVE, E_INVALID_STATE);
        assert!(contributor.owner == tx_context::sender(ctx), E_UNAUTHORIZED);
        
        // Calculate pending reward
        let pending_reward = (contributor.staked_amount * pool.reward_per_stake / 1000000) - contributor.reward_debt;
        
        if (pending_reward > 0) {
            // Calculate user's share (90% of total rewards)
            let user_reward = pending_reward * (100 - (pool.operator_reward_pct as u64)) / 100;
            
            // Update reward debt to prevent double claiming
            contributor.reward_debt = contributor.staked_amount * pool.reward_per_stake / 1000000;
            
            // Transfer reward
            let reward_balance = balance::split(&mut pool.balance, user_reward);
            let reward_coin = coin::from_balance(reward_balance, ctx);
            
            event::emit(RewardClaimed {
                pool_id: object::uid_to_inner(&pool.id),
                claimer: contributor.owner,
                reward_amount: user_reward,
                is_operator: false,
            });
            
            reward_coin
        } else {
            // Return empty coin if no reward
            coin::from_balance(balance::zero<IOTA>(), ctx)
        }
    }

    /// Claim operator rewards (operator only)
    public fun claim_operator_reward(
        pool: &mut ValidatorPool,
        _operator_cap: &OperatorCap,
        ctx: &mut TxContext
    ): Coin<IOTA> {
        assert!(pool.status == ACTIVE, E_INVALID_STATE);
        assert!(tx_context::sender(ctx) == pool.operator, E_UNAUTHORIZED);
        
        // Calculate operator's share of accumulated rewards
        let operator_reward = pool.accumulated_reward * (pool.operator_reward_pct as u64) / 100;
        
        if (operator_reward > 0) {
            // Reset accumulated reward (operator claims everything owed)
            pool.accumulated_reward = 0;
            
            let reward_balance = balance::split(&mut pool.balance, operator_reward);
            let reward_coin = coin::from_balance(reward_balance, ctx);
            
            event::emit(RewardClaimed {
                pool_id: object::uid_to_inner(&pool.id),
                claimer: pool.operator,
                reward_amount: operator_reward,
                is_operator: true,
            });
            
            reward_coin
        } else {
            coin::from_balance(balance::zero<IOTA>(), ctx)
        }
    }

    /// Withdraw stake (only allowed when pool is COLLECTING or READY)
    public fun withdraw_stake(
        pool: &mut ValidatorPool,
        contributor: &mut Contributor,
        amount: u64,
        ctx: &mut TxContext
    ): Coin<IOTA> {
        assert!(pool.status == COLLECTING || pool.status == READY, E_WITHDRAWAL_NOT_ALLOWED);
        assert!(contributor.owner == tx_context::sender(ctx), E_UNAUTHORIZED);
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(contributor.staked_amount >= amount, E_INSUFFICIENT_STAKE);
        
        // Update contributor stake
        contributor.staked_amount = contributor.staked_amount - amount;
        
        // Update pool total stake
        pool.total_stake = pool.total_stake - amount;
        
        // If total stake drops below threshold, move back to COLLECTING
        if (pool.total_stake < pool.required_stake && pool.status == READY) {
            pool.status = COLLECTING;
        };
        
        // Return withdrawn funds
        let withdrawn_balance = balance::split(&mut pool.balance, amount);
        let withdrawal_coin = coin::from_balance(withdrawn_balance, ctx);
        
        event::emit(StakeWithdrawn {
            pool_id: object::uid_to_inner(&pool.id),
            contributor: contributor.owner,
            amount,
            new_total_stake: pool.total_stake,
        });
        
        withdrawal_coin
    }

    // === View Functions ===

    /// Get comprehensive pool information
    public fun get_pool_info(pool: &ValidatorPool): (u64, u64, address, u8, u8, u64, u64) {
        (
            pool.required_stake,
            pool.total_stake,
            pool.operator,
            pool.operator_reward_pct,
            pool.status,
            pool.accumulated_reward,
            balance::value(&pool.balance)
        )
    }

    /// Get contributor information
    public fun get_contributor_info(contributor: &Contributor): (ID, address, u64, u64) {
        (
            contributor.pool_id,
            contributor.owner,
            contributor.staked_amount,
            contributor.reward_debt
        )
    }

    /// Calculate pending reward for a contributor
    public fun calculate_pending_reward(
        pool: &ValidatorPool,
        contributor: &Contributor
    ): u64 {
        if (pool.status != ACTIVE || contributor.staked_amount == 0) {
            return 0
        };
        
        let total_reward = (contributor.staked_amount * pool.reward_per_stake / 1000000) - contributor.reward_debt;
        let user_reward = total_reward * (100 - (pool.operator_reward_pct as u64)) / 100;
        user_reward
    }

    /// Check if pool is ready for activation
    public fun is_ready_for_activation(pool: &ValidatorPool): bool {
        pool.status == READY
    }

    /// Check if contributor belongs to specific pool
    public fun is_contributor_for_pool(contributor: &Contributor, pool: &ValidatorPool): bool {
        contributor.pool_id == object::uid_to_inner(&pool.id)
    }

    // === Entry Functions for Frontend Integration ===

    /// Entry function to create a validator pool with default settings
    entry fun create_validator_pool(
        ctx: &mut TxContext
    ) {
        let (pool, operator_cap) = create_pool(1000000000, 10, ctx); // 1000 IOTA, 10%
        let sender = tx_context::sender(ctx);
        
        transfer::public_transfer(pool, sender);
        transfer::public_transfer(operator_cap, sender);
    }

    /// Entry function to create a validator pool with custom settings
    entry fun create_custom_validator_pool(
        required_stake: u64,
        operator_reward_pct: u8,
        ctx: &mut TxContext
    ) {
        let (pool, operator_cap) = create_pool(required_stake, operator_reward_pct, ctx);
        let sender = tx_context::sender(ctx);
        
        transfer::public_transfer(pool, sender);
        transfer::public_transfer(operator_cap, sender);
    }

    /// Entry function to stake into pool
    entry fun stake_to_pool(
        pool: &mut ValidatorPool,
        stake_coin: Coin<IOTA>,
        ctx: &mut TxContext
    ) {
        let contributor = stake(pool, stake_coin, ctx);
        let sender = tx_context::sender(ctx);
        transfer::public_transfer(contributor, sender);
    }

    /// Entry function to activate pool (operator only)
    entry fun activate_validator_pool(
        pool: &mut ValidatorPool,
        operator_cap: &OperatorCap,
        ctx: &TxContext
    ) {
        activate_pool(pool, operator_cap, ctx);
    }

    /// Entry function to record validator rewards
    entry fun record_validator_reward(
        pool: &mut ValidatorPool,
        reward_coin: Coin<IOTA>,
    ) {
        record_reward(pool, reward_coin);
    }

    /// Entry function to claim user rewards
    entry fun claim_user_reward(
        pool: &mut ValidatorPool,
        contributor: &mut Contributor,
        ctx: &mut TxContext
    ) {
        let reward_coin = claim_reward(pool, contributor, ctx);
        let sender = tx_context::sender(ctx);
        transfer::public_transfer(reward_coin, sender);
    }

    /// Entry function to claim operator rewards
    entry fun claim_operator_rewards(
        pool: &mut ValidatorPool,
        operator_cap: &OperatorCap,
        ctx: &mut TxContext
    ) {
        let reward_coin = claim_operator_reward(pool, operator_cap, ctx);
        let sender = tx_context::sender(ctx);
        transfer::public_transfer(reward_coin, sender);
    }

    /// Entry function to withdraw stake
    entry fun withdraw_user_stake(
        pool: &mut ValidatorPool,
        contributor: &mut Contributor,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let withdrawal_coin = withdraw_stake(pool, contributor, amount, ctx);
        let sender = tx_context::sender(ctx);
        transfer::public_transfer(withdrawal_coin, sender);
    }

    /// Entry function to destroy empty contributor
    entry fun destroy_empty_contributor(contributor: Contributor) {
        let Contributor { id, pool_id: _, owner: _, staked_amount, reward_debt: _ } = contributor;
        assert!(staked_amount == 0, E_INSUFFICIENT_STAKE);
        object::delete(id);
    }

    // === Test-only Functions ===
    
    #[test_only]
    use iota::test_scenario;
    #[test_only]
    use iota::coin::{mint_for_testing};

    #[test_only]
    public fun init_for_testing(_ctx: &mut TxContext) {
        // Test initialization function
    }

    #[test]
    fun test_create_validator_pool() {
        let operator = @0xA;
        
        let mut scenario = test_scenario::begin(operator);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let (pool, operator_cap) = create_pool(1000, 10, ctx);
            
            let (required_stake, total_stake, op_addr, reward_pct, status, _, _) = get_pool_info(&pool);
            assert!(required_stake == 1000);
            assert!(total_stake == 0);
            assert!(op_addr == operator);
            assert!(reward_pct == 10);
            assert!(status == COLLECTING);
            
            transfer::public_transfer(pool, operator);
            transfer::public_transfer(operator_cap, operator);
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_stake_and_pool_lifecycle() {
        let operator = @0xA;
        let user = @0xB;
        
        let mut scenario = test_scenario::begin(operator);
        
        // Create pool
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let (pool, operator_cap) = create_pool(1000, 10, ctx);
            transfer::public_transfer(pool, operator);
            transfer::public_transfer(operator_cap, operator);
        };
        
        // Transfer pool to user for staking
        test_scenario::next_tx(&mut scenario, operator);
        {
            let pool = test_scenario::take_from_sender<ValidatorPool>(&scenario);
            transfer::public_transfer(pool, user);
        };
        
        // User stakes (reaches threshold)
        test_scenario::next_tx(&mut scenario, user);
        {
            let mut pool = test_scenario::take_from_sender<ValidatorPool>(&scenario);
            let ctx = test_scenario::ctx(&mut scenario);
            let stake_coin = mint_for_testing<IOTA>(1000, ctx);
            
            let contributor = stake(&mut pool, stake_coin, ctx);
            let (_, _, staked, _) = get_contributor_info(&contributor);
            assert!(staked == 1000);
            
            let (_, total_stake, _, _, status, _, _) = get_pool_info(&pool);
            assert!(total_stake == 1000);
            assert!(status == READY); // Should transition to READY
            
            transfer::public_transfer(contributor, user);
            transfer::public_transfer(pool, operator);
        };
        
        // Operator activates pool
        test_scenario::next_tx(&mut scenario, operator);
        {
            let mut pool = test_scenario::take_from_sender<ValidatorPool>(&scenario);
            let operator_cap = test_scenario::take_from_sender<OperatorCap>(&scenario);
            let ctx = test_scenario::ctx(&mut scenario);
            
            activate_pool(&mut pool, &operator_cap, ctx);
            
            let (_, _, _, _, status, _, _) = get_pool_info(&pool);
            assert!(status == ACTIVE); // Should be ACTIVE now
            
            transfer::public_transfer(pool, user);
            transfer::public_transfer(operator_cap, operator);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_reward_distribution() {
        let operator = @0xA;
        let user = @0xB;
        
        let mut scenario = test_scenario::begin(operator);
        
        // Setup active pool with stake
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let (mut pool, operator_cap) = create_pool(1000, 20, ctx); // 20% operator cut
            let stake_coin = mint_for_testing<IOTA>(1000, ctx);
            let contributor = stake(&mut pool, stake_coin, ctx);
            activate_pool(&mut pool, &operator_cap, ctx);
            
            transfer::public_transfer(pool, operator);
            transfer::public_transfer(operator_cap, operator);
            transfer::public_transfer(contributor, user);
        };
        
        // Record rewards
        test_scenario::next_tx(&mut scenario, operator);
        {
            let mut pool = test_scenario::take_from_sender<ValidatorPool>(&scenario);
            let reward_coin = mint_for_testing<IOTA>(100, test_scenario::ctx(&mut scenario)); // 100 IOTA reward
            
            record_reward(&mut pool, reward_coin);
            
            let (_, _, _, _, _, accumulated_reward, _) = get_pool_info(&pool);
            assert!(accumulated_reward == 100);
            
            transfer::public_transfer(pool, user);
        };
        
        test_scenario::end(scenario);
    }
}