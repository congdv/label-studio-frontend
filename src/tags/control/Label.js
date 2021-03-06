import ColorScheme from "pleasejs";
import React from "react";
import { Tag } from "antd";
import { getRoot, getParentOfType, types } from "mobx-state-tree";
import { observer, inject } from "mobx-react";

import Hint from "../../components/Hint/Hint";
import ProcessAttrsMixin from "../../mixins/ProcessAttrs";
import Registry from "../../core/Registry";
import Constants from "../../core/Constants";
import Types from "../../core/Types";
import Utils from "../../utils";
import { guidGenerator } from "../../core/Helpers";
import { runTemplate } from "../../core/Template";
import { LabelsModel } from "./Labels";

/**
 * Label tag represents a single label
 * @example
 * <View>
 *   <Labels name="type" toName="txt-1">
 *     <Label alias="B" value="Brand" />
 *     <Label alias="P" value="Product" />
 *   </Labels>
 *   <Text name="txt-1" value="$text" />
 * </View>
 * @name Label
 * @param {string} value                    - value of the label
 * @param {boolean} [selected=false]        - if this label should be preselected
 * @param {string} [hotkey]                 - hotkey, if not specified then will be automatically generated
 * @param {string} [alias]                  - label alias
 * @param {boolean} [showAlias=false]       - show alias inside label text
 * @param {string} [aliasStyle=opacity:0.6] - alias CSS style
 * @param {string} [size=medium]            - size of text in the label
 * @param {string} [background]             - background color of an active label
 * @param {string} [selectedColor]          - color of text in an active label
 */
const TagAttrs = types.model({
  value: types.maybeNull(types.string),
  selected: types.optional(types.boolean, false),
  alias: types.maybeNull(types.string),
  hotkey: types.maybeNull(types.string),
  showalias: types.optional(types.boolean, false),
  aliasstyle: types.optional(types.string, "opacity: 0.6"),
  size: types.optional(types.string, "medium"),
  background: types.optional(types.string, Constants.LABEL_BACKGROUND),
  selectedcolor: types.optional(types.string, "white"),
});

const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    type: "label",
    _value: types.optional(types.string, ""),
  })
  .views(self => ({
    get completion() {
      return getRoot(self).completionStore.selected;
    },
  }))
  .actions(self => ({
    /**
     * Select label
     */
    toggleSelected() {
      const selectedLabel = self.selected;

      const labels = Types.getParentOfTypeString(self, [
        "LabelsModel",
        "EllipseLabelsModel",
        "RectangleLabelsModel",
        "PolygonLabelsModel",
        "KeyPointLabelsModel",
        "BrushLabelsModel",
        "HyperTextLabelsModel",
      ]);

      // labels.finshCurrentObject();
      const reg = self.completion.highlightedNode;

      // check if there is a region selected and if it is and user
      // is changing the label we need to make sure that region is
      // not going to endup without the label(s) at all
      if (reg) {
        const sel = labels.selectedLabels;
        if (sel.length === 1 && sel[0]._value === self._value) return;
      }

      /**
       * Multiple
       */
      if (!labels.shouldBeUnselected) {
        self.setSelected(!self.selected);
      }

      /**
       * Single
       */
      if (labels.shouldBeUnselected) {
        /**
         * Current not selected
         */
        if (!selectedLabel) {
          labels.unselectAll();
          self.setSelected(!self.selected);
        } else {
          labels.unselectAll();
        }
      }

      if (reg) {
        reg.updateSingleState(labels);
      }
    },

    /**
     *
     * @param {boolean} value
     */
    setSelected(value) {
      self.selected = value;
    },

    onHotKey() {
      return self.toggleSelected();
    },

    _updateBackgroundColor(val) {
      if (self.background === Constants.LABEL_BACKGROUND) self.background = ColorScheme.make_color({ seed: val })[0];
    },

    afterCreate() {
      self._updateBackgroundColor(self._value || self.value);
    },

    updateValue(store) {
      self._value = runTemplate(self.value, store.task.dataObj) || "";
      self._updateBackgroundColor(self._value);
    },
  }));

const LabelModel = types.compose("LabelModel", TagAttrs, Model, ProcessAttrsMixin);

const HtxLabelView = inject("store")(
  observer(({ item, store }) => {
    const bg = item.background;
    const labelStyle = {
      backgroundColor: item.selected ? bg : "#e8e8e8",
      color: item.selected ? item.selectedcolor : "#333333",
      cursor: "pointer",
      margin: "5px",
    };

    return (
      <Tag
        onClick={ev => {
          if (!item.completion.edittable) return;

          item.toggleSelected();
          return false;
        }}
        style={labelStyle}
        size={item.size}
      >
        {item._value}
        {item.showalias === true && item.alias && (
          <span style={Utils.styleToProp(item.aliasstyle)}>&nbsp;{item.alias}</span>
        )}
        {store.settings.enableTooltips && store.settings.enableHotkeys && item.hotkey && <Hint>[{item.hotkey}]</Hint>}
      </Tag>
    );
  }),
);

Registry.addTag("label", LabelModel, HtxLabelView);

export { HtxLabelView, LabelModel };
