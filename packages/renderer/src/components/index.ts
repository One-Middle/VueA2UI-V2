/**
 * Basic Catalog 组件注册索引。
 *
 * 将所有 Basic Catalog 组件注册到全局 catalogRegistry 中，
 * 这样 A2uiComponent 就可以按组件类型名动态查找对应的 Vue 组件。
 */

import { catalogRegistry } from "../catalog-registry";
import TextComponent from "./basic/TextComponent.vue";
import ImageComponent from "./basic/ImageComponent.vue";
import IconComponent from "./basic/IconComponent.vue";
import VideoComponent from "./basic/VideoComponent.vue";
import AudioPlayerComponent from "./basic/AudioPlayerComponent.vue";
import DividerComponent from "./basic/DividerComponent.vue";
import RowComponent from "./basic/RowComponent.vue";
import ColumnComponent from "./basic/ColumnComponent.vue";
import ListComponent from "./basic/ListComponent.vue";
import CardComponent from "./basic/CardComponent.vue";
import TabsComponent from "./basic/TabsComponent.vue";
import ModalComponent from "./basic/ModalComponent.vue";
import ButtonComponent from "./basic/ButtonComponent.vue";
import TextFieldComponent from "./basic/TextFieldComponent.vue";
import CheckBoxComponent from "./basic/CheckBoxComponent.vue";
import ChoicePickerComponent from "./basic/ChoicePickerComponent.vue";
import SliderComponent from "./basic/SliderComponent.vue";
import DateTimeInputComponent from "./basic/DateTimeInputComponent.vue";

/** 注册所有 Basic Catalog 组件 */
export function registerBasicCatalog(): void {
  catalogRegistry.set("Text", TextComponent);
  catalogRegistry.set("Image", ImageComponent);
  catalogRegistry.set("Icon", IconComponent);
  catalogRegistry.set("Video", VideoComponent);
  catalogRegistry.set("AudioPlayer", AudioPlayerComponent);
  catalogRegistry.set("Divider", DividerComponent);
  catalogRegistry.set("Row", RowComponent);
  catalogRegistry.set("Column", ColumnComponent);
  catalogRegistry.set("List", ListComponent);
  catalogRegistry.set("Card", CardComponent);
  catalogRegistry.set("Tabs", TabsComponent);
  catalogRegistry.set("Modal", ModalComponent);
  catalogRegistry.set("Button", ButtonComponent);
  catalogRegistry.set("TextField", TextFieldComponent);
  catalogRegistry.set("CheckBox", CheckBoxComponent);
  catalogRegistry.set("ChoicePicker", ChoicePickerComponent);
  catalogRegistry.set("Slider", SliderComponent);
  catalogRegistry.set("DateTimeInput", DateTimeInputComponent);
}

export { TextComponent, ImageComponent, IconComponent, VideoComponent,
  AudioPlayerComponent, DividerComponent, RowComponent, ColumnComponent,
  ListComponent, CardComponent, TabsComponent, ModalComponent, ButtonComponent,
  TextFieldComponent, CheckBoxComponent, ChoicePickerComponent, SliderComponent,
  DateTimeInputComponent };
