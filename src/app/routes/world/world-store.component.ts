/*
 Copyright (C) 2013-2015 by Justin DuJardin and Contributors

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
import * as _ from 'underscore';
import * as rpg from '../../../game/rpg/game';
import {Component, ViewEncapsulation, Input, Output, EventEmitter, OnDestroy} from '@angular/core';
import {RPGGame, NotificationService} from '../../services';
import {AppState} from '../../app.model';
import {Store} from '@ngrx/store';
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {IScene} from '../../../game/pow2/interfaces/IScene';
import {Item} from '../../models/item';
import {GameState} from '../../models/game-state/game-state.model';
import {GameStateAddGoldAction} from '../../models/game-state/game-state.actions';
import {StoreFeatureComponent} from '../../../game/rpg/components/features/storeFeatureComponent';
import {getGamePartyGold, sliceGameState} from '../../models/selectors';
import {EntityRemoveItemAction, EntityAddItemAction} from '../../models/entity/entity.actions';
import {ITemplateItem} from '../../models/game-data/game-data.model';

@Component({
  selector: 'world-store',
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./world-store.component.scss'],
  templateUrl: './world-store.component.html',
})
export class WorldStoreComponent implements OnDestroy {
  @Output() onClose = new EventEmitter();

  partyGold$: Observable<number> = this.store.select(getGamePartyGold);

  private _name$ = new BehaviorSubject<string>('Invalid Store');
  name$: Observable<string> = this._name$;

  private _selling$ = new BehaviorSubject<boolean>(false);
  /** Determine if the UI is in a selling state. */
  selling$: Observable<boolean> = this._selling$;

  /** @internal */
  _selected$ = new BehaviorSubject<Item>(null);
  /** The selected item to purchase/sell. */
  selected$: Observable<Item> = this._selected$;

  isBuying$: Observable<boolean> = Observable
    .combineLatest(this.selected$, this.selling$, (selected: boolean, selling: boolean) => {
      return !selected && !selling;
    });

  isSelling$: Observable<boolean> = Observable
    .combineLatest(this.selected$, this.selling$, (selected: boolean, selling: boolean) => {
      return !selected && selling;
    });

  /** Verb for the current buy/sell state for an action button */
  actionVerb$: Observable<string> = this.selling$.map((selling: boolean) => {
    return selling ? 'Sell' : 'Buy';
  });

  /** @internal */
  _onAction$ = new Subject<void>();
  /** @internal */
  _onToggleAction$ = new Subject<Item>();

  private _doToggleActionSubscription$ = this._onToggleAction$
    .do(() => {
      let selling = this._selling$.value;
      if (!selling) {
        if (this._inventory$.value.length === 0) {
          this.notify.show("You don't have any unequipped inventory to sell.", null, 1500);
          this._selling$.next(false);
          return;
        }
      }
      this._selling$.next(!selling);
    }).subscribe();

  /** Stream of clicks on the actionable button */
  private _doActionSubscription$ = this._onAction$
    .switchMap(() => this.store.select(sliceGameState))
    .do((model: GameState) => {
      if (!this._selected$.value) {
        return;
      }
      const item = this._selected$.value;
      const isSelling = this._selling$.value;
      const value: number = item.value;
      if (!isSelling && value > model.gold) {
        this.notify.show("You don't have enough money");
        return;
      }

      this._selected$.next(null);
      this._selling$.next(false);

      if (isSelling) {
        this.store.dispatch(new GameStateAddGoldAction(value));
        this.notify.show(`Sold ${item.name} for ${item.value} gold.`, null, 1500);
        this.store.dispatch(new EntityRemoveItemAction(item.eid));
      }
      else {
        this.store.dispatch(new GameStateAddGoldAction(-value));
        this.notify.show(`Purchased ${item.name}.`, null, 1500);
        this.store.dispatch(new EntityAddItemAction(item));
      }

    }).subscribe();
  /** Stream of clicks on the actionable button */
  actionClick$: Observable<MouseEvent> = new Subject<MouseEvent>();

  // Have to add @Input() here because decorators are not inherited with extends
  @Input() scene: IScene;

  private _inventory$ = new BehaviorSubject<ITemplateItem[]>([]);
  inventory$: Observable<ITemplateItem[]> = this._inventory$;

  constructor(public game: RPGGame,
              public notify: NotificationService,
              public store: Store<AppState>) {
  }

  ngOnDestroy(): void {
    this._doActionSubscription$.unsubscribe();
    this._doToggleActionSubscription$.unsubscribe();
  }

  @Input()
  set feature(feature: StoreFeatureComponent) {
    // Get enemies data from spreadsheet
    const data = this.game.world.spreadsheet;

    let hasCategory: boolean = typeof feature.host.category !== 'undefined';
    let theChoices: any[] = [];
    ['weapons', 'armor', 'items'].forEach((category: string) => {
      if (!hasCategory || feature.host.category === category) {
        theChoices = theChoices.concat(data.getSheetData(category));
      }
    });
    let items: ITemplateItem[] = [];
    _.each(feature.host.groups, (group: string) => {
      items = items.concat(_.filter(theChoices, (c: any) => {
        // Include items with no "groups" value or items with matching groups.
        return !c.groups || _.indexOf(c.groups, group) !== -1;
      }));
    });

    this._name$.next(feature.name);
    const inventory = _.map(_.where(items, {
      level: feature.host.feature.level
    }), (i: any) => _.extend({}, i)) as ITemplateItem[];
    this._inventory$.next(inventory);
  }

}
